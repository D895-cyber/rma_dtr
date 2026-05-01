// Request timeout middleware
import { Request, Response, NextFunction } from 'express';

const DEFAULT_REQUEST_TIMEOUT_MS = 30000; // 30 seconds
/** Google Sheet export can load thousands of rows + slow Sheets API; short limit caused false failures. */
const SYNC_GOOGLE_SHEET_TIMEOUT_MS = 600000; // 10 minutes

function getTimeoutMsForRequest(req: Request): number {
  const path = (req.originalUrl || req.url || req.path || '').split('?')[0];
  if (path.includes('/sync/google-sheet')) {
    return SYNC_GOOGLE_SHEET_TIMEOUT_MS;
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  const limitMs = getTimeoutMsForRequest(req);

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'Request timeout - the server took too long to respond',
        error: `Request exceeded ${Math.round(limitMs / 1000)} second timeout`,
      });
    }
  }, limitMs);

  // Clear timeout when response is sent
  res.on('finish', () => {
    clearTimeout(timeout);
  });

  res.on('close', () => {
    clearTimeout(timeout);
  });

  next();
}
