import { AppError } from './AppError';

export interface FileUploadResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}

/**
 * Validate medical attachment file
 * @param file - The file to validate
 * @throws AppError if file is invalid
 */
export const validateMedicalFile = (file: Express.Multer.File): void => {
  // Define allowed file types for medical attachments
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // DICOM and medical imaging
    'application/dicom',
    // Text files
    'text/plain',
    // ZIP files for multiple documents
    'application/zip',
  ];

  // Check file type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(
      'Invalid file type. Only images, PDFs, documents, and medical files are allowed.',
      400,
      'fileUpload'
    );
  }

  // Check file size (max 10MB for medical attachments)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new AppError(
      'File size too large. Maximum size is 10MB.',
      400,
      'fileUpload'
    );
  }
};

/**
 * Generate a unique filename for medical attachments
 * @param originalName - The original filename
 * @param patientId - The patient ID for organization
 * @returns string - Unique filename
 */
export const generateMedicalFileName = (
  originalName: string,
  patientId: string
): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.split('.').slice(0, -1).join('.');
  
  return `medical_${patientId}_${timestamp}_${randomString}.${extension}`;
};

/**
 * Get attachment type based on file mimetype
 * @param mimetype - The file mimetype
 * @returns string - Attachment type enum value
 */
export const getAttachmentType = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) {
    return 'IMAGE';
  } else if (mimetype === 'application/pdf') {
    return 'DOCUMENT';
  } else if (mimetype.includes('word') || mimetype.includes('document')) {
    return 'DOCUMENT';
  } else if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
    return 'DOCUMENT';
  } else if (mimetype === 'application/dicom') {
    return 'XRAY';
  } else if (mimetype === 'application/zip') {
    return 'DOCUMENT';
  } else {
    return 'DOCUMENT';
  }
};

/**
 * Process uploaded medical file
 * @param file - The uploaded file
 * @param patientId - The patient ID
 * @param uploadPath - Base path for uploads (optional)
 * @returns Promise<FileUploadResult> - Processed file information
 */
export const processMedicalFile = async (
  file: Express.Multer.File,
  patientId: string,
  uploadPath: string = '/uploads/medical'
): Promise<FileUploadResult> => {
  // Validate the file
  validateMedicalFile(file);

  // Generate unique filename
  const fileName = generateMedicalFileName(file.originalname, patientId);
  
  // Generate file URL (this would typically use your cloud storage or CDN)
  const fileUrl = `${uploadPath}/${fileName}`;
  
  // Get attachment type
  const fileType = getAttachmentType(file.mimetype);

  return {
    fileName,
    fileType,
    fileSize: file.size,
    fileUrl,
  };
};

/**
 * Mock file upload function for development
 * In production, this would integrate with cloud storage (AWS S3, Google Cloud Storage, etc.)
 * @param file - The uploaded file
 * @param patientId - The patient ID
 * @returns Promise<FileUploadResult> - File upload result
 */
export const uploadMedicalFile = async (
  file: Express.Multer.File,
  patientId: string
): Promise<FileUploadResult> => {
  try {
    // Process the file
    const fileResult = await processMedicalFile(file, patientId);
    
    // In a real implementation, you would:
    // 1. Upload the file to cloud storage (S3, GCS, etc.)
    // 2. Store the file metadata in your database
    // 3. Return the file URL and metadata
    
    // For now, we'll simulate the upload
    console.log(`File uploaded: ${fileResult.fileName} for patient ${patientId}`);
    
    return fileResult;
  } catch (error) {
    throw new AppError(
      'Failed to upload medical file',
      500,
      'fileUpload'
    );
  }
};

/**
 * Delete a medical file
 * @param fileUrl - The URL of the file to delete
 * @returns Promise<boolean> - True if deletion was successful
 */
export const deleteMedicalFile = async (fileUrl: string): Promise<boolean> => {
  try {
    // In a real implementation, you would delete the file from cloud storage
    console.log(`File deleted: ${fileUrl}`);
    return true;
  } catch (error) {
    console.error('Error deleting medical file:', error);
    return false;
  }
};