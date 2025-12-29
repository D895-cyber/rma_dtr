// Component wrapper for role-based access control

import React from 'react';
import { usePermissions, Permission } from '../hooks/usePermissions';

interface ProtectedComponentProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  roles?: ('staff' | 'engineer' | 'manager' | 'admin')[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function ProtectedComponent({
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback = null,
  children,
}: ProtectedComponentProps) {
  const { can, canAny, canAll, isRole } = usePermissions();

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!isRole(roles)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permission) {
    if (!can(permission)) {
      return <>{fallback}</>;
    }
  }

  if (permissions && permissions.length > 0) {
    if (requireAll) {
      if (!canAll(permissions)) {
        return <>{fallback}</>;
      }
    } else {
      if (!canAny(permissions)) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
}



