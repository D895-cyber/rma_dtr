import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { sendError } from '../utils/response.util';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return sendError(res, 'Access token required', 401);
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 403);
  }
}




