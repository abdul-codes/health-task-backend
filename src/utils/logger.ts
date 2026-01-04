import fs from 'fs';
import path from 'path';

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

let logFile: string | null = null;

// Only set up file logging for local development
if (!isVercel) {
  const logDir = path.join(__dirname, '../../logs');
  logFile = path.join(logDir, 'errors.log');

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export const logError = (error: any, req: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    controller: error.controller || 'unknown',
    message: error.message,
    stack: error.stack
  };
  
  // Always log to console (Vercel captures this)
  console.error('[ERROR]', JSON.stringify(logEntry));
  
  // Only write to file in local development
  if (!isVercel && logFile) {
    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
};