import { Response } from 'express';

export function sendSuccess(res: Response, data: any, message?: string, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message: message || 'Success',
    data,
  });
}

export function sendError(res: Response, message: string, statusCode: number = 400, error?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
}




