import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { authMiddleware } from '@/middleware/authMiddleware';
import { rateLimitScan } from '@/middleware/rateLimitScan';
import { adminMiddleware } from '@/middleware/adminMiddleware';
import {
  CreateScannedDocumentSchema,
  UpdateVerificationSchema,
  UpdateSyncStatusSchema,
  GetPatientScansQuerySchema,
  GetFailedScansQuerySchema,
  GenerateUploadUrlSchema,
  GenerateDownloadUrlSchema
} from '@/validation/scannedDocumentValidation';
import {
  createScannedDocument,
  getPatientScans,
  getScanById,
  updateScanVerification,
  deleteScan,
  getPendingScans,
  updateSyncStatus,
  retryFailedScan,
  getFailedScans,
  resolveFailedScan,
  generateUploadUrl,
  generateDownloadUrl
} from '@/controller/scannedDocumentController';

const router = Router();

// Create new scanned document (with rate limiting)
router.post(
  '/',
  authMiddleware,
  rateLimitScan,
  validate(CreateScannedDocumentSchema),
  createScannedDocument
);

// Get all scans for a patient
router.get(
  '/patient/:patientId',
  authMiddleware,
  validate(GetPatientScansQuerySchema, 'query'),
  getPatientScans
);

// Get pending scans for current user (auto-sync)
router.get(
  '/pending',
  authMiddleware,
  getPendingScans
);

// Get single scan by ID
router.get(
  '/:id',
  authMiddleware,
  getScanById
);

// Update scan verification status
router.patch(
  '/:id/verify',
  authMiddleware,
  validate(UpdateVerificationSchema),
  updateScanVerification
);

// Update sync status
router.patch(
  '/:id/sync-status',
  authMiddleware,
  validate(UpdateSyncStatusSchema),
  updateSyncStatus
);

// Retry failed scan
router.post(
  '/:id/retry',
  authMiddleware,
  retryFailedScan
);

// Generate presigned URL for uploading image to R2
router.post(
  '/generate-upload-url',
  authMiddleware,
  validate(GenerateUploadUrlSchema),
  generateUploadUrl
);

// Generate presigned URL for downloading/viewing image from R2
router.post(
  '/generate-download-url',
  authMiddleware,
  validate(GenerateDownloadUrlSchema),
  generateDownloadUrl
);

// Delete scan
router.delete(
  '/:id',
  authMiddleware,
  deleteScan
);

// Admin routes
router.get(
  '/admin/failed',
  authMiddleware,
  adminMiddleware,
  validate(GetFailedScansQuerySchema, 'query'),
  getFailedScans
);

router.post(
  '/admin/:id/resolve',
  authMiddleware,
  adminMiddleware,
  resolveFailedScan
);

export default router;
