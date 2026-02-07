import { Request, Response } from 'express';
import { PrismaClient, DocumentType, SyncStatus } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { logScanError } from '@/services/scanErrorLogger';
import { 
  CreateScannedDocumentInput,
  UpdateVerificationInput,
  UpdateSyncStatusInput 
} from '@/validation/scannedDocumentValidation';

const prisma = new PrismaClient();

// Create new scanned document
export const createScannedDocument = async (req: Request, res: Response) => {
  try {
    const data: CreateScannedDocumentInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const scannedDoc = await prisma.scannedDocument.create({
      data: {
        ...data,
        createdBy: userId,
        syncStatus: 'PENDING'
      },
      include: {
        patient: true,
        task: true
      }
    });

    res.status(201).json({
      success: true,
      data: scannedDoc,
      message: 'Scanned document created successfully'
    });
  } catch (error) {
    console.error('Create scanned document error:', error);
    throw new AppError('Failed to create scanned document', 500);
  }
};

// Get all scans for a patient
export const getPatientScans = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, documentType, syncStatus } = req.query;

    const where: any = { patientId };
    if (documentType) where.documentType = documentType;
    if (syncStatus) where.syncStatus = syncStatus;

    const [scans, total] = await Promise.all([
      prisma.scannedDocument.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: { id: true, name: true }
          },
          task: {
            select: { id: true, title: true }
          }
        }
      }),
      prisma.scannedDocument.count({ where })
    ]);

    res.json({
      success: true,
      data: scans,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get patient scans error:', error);
    throw new AppError('Failed to retrieve scans', 500);
  }
};

// Get single scan by ID
export const getScanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scan = await prisma.scannedDocument.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true, medicalRecord: true }
        },
        task: {
          select: { id: true, title: true, status: true }
        }
      }
    });

    if (!scan) {
      throw new AppError('Scanned document not found', 404);
    }

    res.json({
      success: true,
      data: scan
    });
  } catch (error) {
    console.error('Get scan by ID error:', error);
    throw error;
  }
};

// Update scan verification status
export const updateScanVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isVerified }: UpdateVerificationInput = req.body;

    const updatedScan = await prisma.scannedDocument.update({
      where: { id },
      data: { isVerified },
      include: {
        patient: true,
        task: true
      }
    });

    res.json({
      success: true,
      data: updatedScan,
      message: 'Verification status updated'
    });
  } catch (error) {
    console.error('Update verification error:', error);
    throw new AppError('Failed to update verification status', 500);
  }
};

// Delete scan
export const deleteScan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.scannedDocument.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Scanned document deleted successfully'
    });
  } catch (error) {
    console.error('Delete scan error:', error);
    throw new AppError('Failed to delete scan', 500);
  }
};

// Get pending scans for current user (for auto-sync)
export const getPendingScans = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const pendingScans = await prisma.scannedDocument.findMany({
      where: {
        createdBy: userId,
        syncStatus: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        patient: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      data: pendingScans,
      count: pendingScans.length
    });
  } catch (error) {
    console.error('Get pending scans error:', error);
    throw new AppError('Failed to retrieve pending scans', 500);
  }
};

// Update sync status
export const updateSyncStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { syncStatus, errorLog }: UpdateSyncStatusInput = req.body;

    const updatedScan = await prisma.scannedDocument.update({
      where: { id },
      data: {
        syncStatus,
        errorLog: errorLog || null,
        retryCount: syncStatus === 'FAILED' 
          ? { increment: 1 }
          : undefined
      }
    });

    // Log error if status is FAILED
    if (syncStatus === 'FAILED' && errorLog) {
      await logScanError(id, new Error(errorLog), {
        userId: req.user?.id,
        retryCount: updatedScan.retryCount
      });
    }

    res.json({
      success: true,
      data: updatedScan,
      message: 'Sync status updated'
    });
  } catch (error) {
    console.error('Update sync status error:', error);
    throw new AppError('Failed to update sync status', 500);
  }
};

// Retry failed scan
export const retryFailedScan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scan = await prisma.scannedDocument.findUnique({
      where: { id }
    });

    if (!scan) {
      throw new AppError('Scan not found', 404);
    }

    if (scan.syncStatus !== 'FAILED') {
      throw new AppError('Only failed scans can be retried', 400);
    }

    // Reset to PENDING for retry
    const updatedScan = await prisma.scannedDocument.update({
      where: { id },
      data: {
        syncStatus: 'PENDING',
        retryCount: 0,
        errorLog: null
      }
    });

    res.json({
      success: true,
      data: updatedScan,
      message: 'Scan marked for retry'
    });
  } catch (error) {
    console.error('Retry scan error:', error);
    throw error;
  }
};

// Admin: Get all failed scans
export const getFailedScans = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const where: any = {
      syncStatus: 'FAILED'
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [failedScans, total] = await Promise.all([
      prisma.scannedDocument.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          createdBy: true,
          retryCount: true,
          errorLog: true,
          createdAt: true
        }
      }),
      prisma.scannedDocument.count({ where })
    ]);

    res.json({
      success: true,
      data: failedScans,
      count: total,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get failed scans error:', error);
    throw new AppError('Failed to retrieve failed scans', 500);
  }
};

// Admin: Resolve failed scan error
export const resolveFailedScan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Mark scan as resolved in error log
    await prisma.scanErrorLog.updateMany({
      where: { scanId: id },
      data: { resolved: true }
    });

    // Optionally reset scan status
    const { resetStatus } = req.body;
    if (resetStatus) {
      await prisma.scannedDocument.update({
        where: { id },
        data: {
          syncStatus: 'PENDING',
          retryCount: 0,
          errorLog: null
        }
      });
    }

    res.json({
      success: true,
      message: 'Failed scan marked as resolved'
    });
  } catch (error) {
    console.error('Resolve failed scan error:', error);
    throw new AppError('Failed to resolve scan', 500);
  }
};
