import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response.util';
import { Permission, hasPermission, hasAnyPermission, UserRole } from '../utils/permissions.util';

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
}

/**
 * Middleware to require specific permission(s)
 * User needs at least one of the specified permissions
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const userRole = req.user.role as UserRole;
    
    if (!hasAnyPermission(userRole, permissions)) {
      return sendError(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
}

/**
 * Middleware to require all specified permissions
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const userRole = req.user.role as UserRole;
    const hasAll = permissions.every(permission => hasPermission(userRole, permission));
    
    if (!hasAll) {
      return sendError(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
}






