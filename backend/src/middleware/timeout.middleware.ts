// Request timeout middleware
import { Request, Response, NextFunction } from 'express';

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  // Set timeout for the request
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'Request timeout - the server took too long to respond',
        error: 'Request exceeded 30 second timeout',
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear timeout when response is sent
  res.on('finish', () => {
    clearTimeout(timeout);
  });

  res.on('close', () => {
    clearTimeout(timeout);
  });

  next();
}
