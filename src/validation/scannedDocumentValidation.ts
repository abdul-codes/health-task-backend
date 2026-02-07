import { z } from 'zod';
import { DocumentType, SyncStatus } from '@prisma/client';

// Document type enum validation
const DocumentTypeEnum = z.enum([
  'PATIENT_RECORD',
  'PRESCRIPTION',
  'LAB_RESULT',
  'TASK_NOTE'
]);

// Sync status enum validation
const SyncStatusEnum = z.enum([
  'PENDING',
  'SYNCED',
  'FAILED'
]);

// Extracted field schema
const ExtractedFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  value: z.string(),
  confidence: z.number().min(0).max(100),
  isVerified: z.boolean().default(false)
});

// Create scanned document validation
export const CreateScannedDocumentSchema = z.object({
  patientId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  documentType: DocumentTypeEnum,
  r2ObjectKey: z.string().optional(),
  extractedData: z.object({
    fields: z.array(ExtractedFieldSchema).min(1, 'At least one field is required')
  }),
  rawText: z.string().optional(),
  confidence: z.number().min(0).max(100)
}).refine(
  (data) => data.patientId || data.taskId,
  {
    message: 'Either patientId or taskId must be provided',
    path: ['patientId']
  }
);

// Update verification validation
export const UpdateVerificationSchema = z.object({
  isVerified: z.boolean()
});

// Update sync status validation
export const UpdateSyncStatusSchema = z.object({
  syncStatus: SyncStatusEnum,
  errorLog: z.string().optional()
});

// Retry sync validation
export const RetrySyncSchema = z.object({
  scanId: z.string().uuid()
});

// Query parameters validation
export const GetPatientScansQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  documentType: DocumentTypeEnum.optional(),
  syncStatus: SyncStatusEnum.optional()
});

// Admin query parameters
export const GetFailedScansQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Types inferred from schemas
export type CreateScannedDocumentInput = z.infer<typeof CreateScannedDocumentSchema>;
export type UpdateVerificationInput = z.infer<typeof UpdateVerificationSchema>;
export type UpdateSyncStatusInput = z.infer<typeof UpdateSyncStatusSchema>;
export type RetrySyncInput = z.infer<typeof RetrySyncSchema>;
export type GetPatientScansQueryInput = z.infer<typeof GetPatientScansQuerySchema>;
export type GetFailedScansQueryInput = z.infer<typeof GetFailedScansQuerySchema>;
