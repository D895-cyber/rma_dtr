// Hook for checking user permissions

import { useAuth } from '../contexts/AuthContext';
import { Permission, UserRole, hasPermission, hasAnyPermission, hasAllPermissions, hasRole } from '../utils/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const userRole = (user?.role || 'staff') as UserRole;

  return {
    // Check single permission
    can: (permission: Permission): boolean => {
      if (!user) return false;
      return hasPermission(userRole, permission);
    },

    // Check if user has any of the permissions
    canAny: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAnyPermission(userRole, permissions);
    },

    // Check if user has all permissions
    canAll: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAllPermissions(userRole, permissions);
    },

    // Check if user has specific role
    isRole: (roles: UserRole[]): boolean => {
      if (!user) return false;
      return hasRole(user.role, roles);
    },

    // Get current user role
    role: userRole,

    // Check if user is admin
    isAdmin: userRole === 'admin',

    // Check if user is manager or admin
    isManager: userRole === 'manager' || userRole === 'admin',

    // Check if user is engineer or above
    isEngineer: ['engineer', 'manager', 'admin'].includes(userRole),
  };
}



