import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Simple logging with context
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.error(`Controller: ${err instanceof AppError ? err.controller : 'unknown'}`);
  console.error(`Error: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(`Stack: ${err.stack}`);
  }

  // Simple response
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { controller: err instanceof AppError ? err.controller : 'unknown' })
  });
};