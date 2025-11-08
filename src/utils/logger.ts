import fs from 'fs';
import path from 'path';

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'errors.log');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
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
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};