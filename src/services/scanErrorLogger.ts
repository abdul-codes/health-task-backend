import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ErrorContext {
  userId?: string;
  retryCount?: number;
  patientId?: string;
  taskId?: string;
  [key: string]: any;
}

export const logScanError = async (
  scanId: string,
  error: Error,
  context?: ErrorContext
): Promise<void> => {
  try {
    // Create error log entry
    await prisma.scanErrorLog.create({
      data: {
        scanId,
        errorMessage: error.message,
        stackTrace: error.stack || null,
        context: context ? JSON.stringify(context) : null,
        resolved: false
      }
    });

    // Also log to console for immediate visibility
    console.error(`[Scan Error] Scan ID: ${scanId}`, {
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with Sentry or other error tracking service
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error, {
    //     extra: { scanId, context }
    //   });
    // }
  } catch (logError) {
    // If logging fails, at least log to console
    console.error('Failed to log scan error:', logError);
    console.error('Original error:', error);
  }
};

// Clean up old error logs (older than 30 days)
export const cleanupOldErrorLogs = async (): Promise<number> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.scanErrorLog.deleteMany({
    where: {
      timestamp: {
        lt: thirtyDaysAgo
      },
      resolved: true // Only delete resolved errors
    }
  });

  console.log(`Cleaned up ${result.count} old error logs`);
  return result.count;
};

// Get error statistics for admin dashboard
export const getErrorStats = async () => {
  const [
    totalErrors,
    unresolvedErrors,
    recentErrors,
    errorsByType
  ] = await Promise.all([
    prisma.scanErrorLog.count(),
    prisma.scanErrorLog.count({ where: { resolved: false } }),
    prisma.scanErrorLog.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    }),
    prisma.scanErrorLog.groupBy({
      by: ['errorMessage'],
      _count: { errorMessage: true },
      orderBy: { _count: { errorMessage: 'desc' } },
      take: 10
    })
  ]);

  return {
    totalErrors,
    unresolvedErrors,
    recentErrors,
    topErrors: errorsByType
  };
};
