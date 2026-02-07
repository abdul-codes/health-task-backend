import rateLimit from 'express-rate-limit';

// Rate limiter for document scanning
// 10 scans per minute per user
export const rateLimitScan = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many scan requests. Please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key instead of IP
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  // Skip rate limiting for admin users
  skip: (req) => {
    return req.user?.role === 'ADMIN';
  }
});
