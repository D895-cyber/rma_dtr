// Frontend permissions system (mirrors backend)

export type Permission = 
  // DTR Permissions
  | 'dtr:view'
  | 'dtr:create'
  | 'dtr:update'
  | 'dtr:assign'
  | 'dtr:close'
  | 'dtr:delete'
  // RMA Permissions
  | 'rma:view'
  | 'rma:create'
  | 'rma:update'
  | 'rma:assign'
  | 'rma:update_status'
  | 'rma:update_tracking'
  | 'rma:email_client'
  | 'rma:delete'
  // Master Data Permissions
  | 'master:view'
  | 'master:create'
  | 'master:update'
  | 'master:delete'
  // Analytics Permissions
  | 'analytics:view'
  // User Management Permissions
  | 'users:view'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:resetPassword'
  // Parts & Models Permissions
  | 'parts:view'
  | 'parts:create'
  | 'parts:update'
  | 'parts:delete'
  | 'models:view'
  | 'models:create'
  | 'models:update'
  | 'models:delete';

export type UserRole = 'staff' | 'engineer' | 'manager' | 'admin';

// Define permissions for each role (must match backend)
const rolePermissions: Record<UserRole, Permission[]> = {
  staff: [
    'dtr:view',
    'rma:view',
    'analytics:view',
    'master:view',
    'parts:view',
    'models:view',
  ],
  engineer: [
    'dtr:view',
    'rma:view',
    'analytics:view',
    'master:view',
    'parts:view',
    'models:view',
    'dtr:create',
    'dtr:update',
    'rma:create',
    'rma:update',
  ],
  manager: [
    'dtr:view',
    'rma:view',
    'analytics:view',
    'master:view',
    'parts:view',
    'models:view',
    'dtr:create',
    'dtr:update',
    'dtr:assign',
    'dtr:close',
    'rma:create',
    'rma:update',
    'rma:assign',
    'rma:update_status',
    'rma:update_tracking',
    'rma:email_client',
    'master:create',
    'master:update',
    'parts:create',
    'parts:update',
    'models:create',
    'models:update',
    'users:view',
  ],
  admin: [
    'dtr:view',
    'dtr:create',
    'dtr:update',
    'dtr:assign',
    'dtr:close',
    'dtr:delete',
    'rma:view',
    'rma:create',
    'rma:update',
    'rma:assign',
    'rma:update_status',
    'rma:update_tracking',
    'rma:email_client',
    'rma:delete',
    'analytics:view',
    'master:view',
    'master:create',
    'master:update',
    'master:delete',
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'users:resetPassword',
    'parts:view',
    'parts:create',
    'parts:update',
    'parts:delete',
    'models:view',
    'models:create',
    'models:update',
    'models:delete',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}



