// TypeScript types for Scanned Document API

import { DocumentType, SyncStatus } from '@prisma/client';

// Extracted field from OCR
export interface ExtractedField {
  name: string;
  value: string;
  confidence: number;
  isVerified: boolean;
}

// Request types
export interface CreateScannedDocumentRequest {
  patientId?: string;
  taskId?: string;
  documentType: DocumentType;
  r2ObjectKey?: string;
  extractedData: {
    fields: ExtractedField[];
  };
  rawText?: string;
  confidence: number;
}

export interface UpdateVerificationRequest {
  isVerified: boolean;
}

export interface RetrySyncRequest {
  scanId: string;
}

// Response types
export interface ScannedDocumentResponse {
  id: string;
  patientId?: string;
  taskId?: string;
  documentType: DocumentType;
  r2ObjectKey?: string;
  extractedData: {
    fields: ExtractedField[];
  };
  rawText?: string;
  confidence: number;
  isVerified: boolean;
  syncStatus: SyncStatus;
  retryCount: number;
  errorLog?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScannedDocumentListResponse {
  success: boolean;
  data: ScannedDocumentResponse[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ScannedDocumentSingleResponse {
  success: boolean;
  data: ScannedDocumentResponse;
}

// Sync-related types
export interface PendingScansResponse {
  success: boolean;
  data: ScannedDocumentResponse[];
  count: number;
}

export interface SyncStatusUpdateRequest {
  syncStatus: SyncStatus;
  errorLog?: string;
}

// Admin types
export interface FailedScanResponse {
  id: string;
  documentType: DocumentType;
  createdBy: string;
  retryCount: number;
  errorLog?: string;
  createdAt: Date;
}

export interface FailedScansListResponse {
  success: boolean;
  data: FailedScanResponse[];
  count: number;
}

// R2 presigned URL response
export interface PresignedUrlResponse {
  success: boolean;
  uploadUrl?: string;
  downloadUrl?: string;
  objectKey: string;
  expiresIn: number;
}

// Error log entry
export interface ScanErrorLogEntry {
  id: string;
  scanId: string;
  errorMessage: string;
  stackTrace?: string;
  context?: string;
  timestamp: Date;
  resolved: boolean;
}
