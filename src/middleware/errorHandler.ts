import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logError } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Console logging 
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.error(`Controller: ${err instanceof AppError ? err.controller : 'unknown'}`);
  console.error(`Error: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(`Stack: ${err.stack}`);
  }

  // File logging (new)
  logError(err, req);

  // Simple response
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { controller: err instanceof AppError ? err.controller : 'unknown' })
  });
};