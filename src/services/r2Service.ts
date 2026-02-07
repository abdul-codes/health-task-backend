import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '@/utils/AppError';

// R2 Configuration
const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'medictask-scans',
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
};

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId || '',
    secretAccessKey: R2_CONFIG.secretAccessKey || '',
  },
});

// Generate unique object key for scan
export const generateObjectKey = (
  userId: string,
  patientId?: string,
  extension: string = 'jpg'
): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  if (patientId) {
    return `scans/${userId}/${patientId}/${timestamp}-${randomSuffix}.${extension}`;
  }
  
  return `scans/${userId}/${timestamp}-${randomSuffix}.${extension}`;
};

// Generate presigned URL for upload
export const generateUploadUrl = async (
  objectKey: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: objectKey,
      ContentType: 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return uploadUrl;
  } catch (error) {
    console.error('Generate upload URL error:', error);
    throw new AppError('Failed to generate upload URL', 500);
  }
};

// Generate presigned URL for download/viewing
export const generateDownloadUrl = async (
  objectKey: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return downloadUrl;
  } catch (error) {
    console.error('Generate download URL error:', error);
    throw new AppError('Failed to generate download URL', 500);
  }
};

// Delete object from R2
export const deleteObject = async (objectKey: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: objectKey,
    });

    await s3Client.send(command);
    console.log(`Deleted object: ${objectKey}`);
  } catch (error) {
    console.error('Delete object error:', error);
    throw new AppError('Failed to delete object from storage', 500);
  }
};

// Check if R2 is configured
export const isR2Configured = (): boolean => {
  return !!(
    R2_CONFIG.accountId &&
    R2_CONFIG.accessKeyId &&
    R2_CONFIG.secretAccessKey &&
    R2_CONFIG.bucketName
  );
};

// Get R2 configuration status
export const getR2Status = () => {
  return {
    configured: isR2Configured(),
    bucketName: R2_CONFIG.bucketName,
    accountId: R2_CONFIG.accountId ? '***configured***' : null,
    hasCredentials: !!(R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey),
  };
};

// Setup lifecycle policy for 90-day auto-delete
// Note: This needs to be run once during setup
export const setupLifecyclePolicy = async (): Promise<void> => {
  // R2 currently doesn't support lifecycle policies via API
  // You need to set this up manually in the Cloudflare dashboard:
  // 1. Go to R2 bucket settings
  // 2. Add lifecycle rule
  // 3. Delete objects after 90 days
  
  console.log('⚠️  Lifecycle policy must be configured manually in Cloudflare dashboard');
  console.log('   Set objects to auto-delete after 90 days for bucket:', R2_CONFIG.bucketName);
};

// Batch delete old objects (fallback if lifecycle policy not set)
export const cleanupOldObjects = async (olderThanDays: number = 90): Promise<number> => {
  // This is a placeholder - implementing full batch deletion would require
  // listing all objects and filtering by date, which can be expensive
  // Better to rely on lifecycle policies
  
  console.log(`⚠️  Manual cleanup not implemented. Please use R2 lifecycle policies.`);
  return 0;
};

// Validate image file type
export const validateImageType = (contentType: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  
  return allowedTypes.includes(contentType);
};

// Get file extension from content type
export const getExtensionFromContentType = (contentType: string): string => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  
  return extensions[contentType] || 'jpg';
};
