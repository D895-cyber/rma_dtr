# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document describes the complete RBAC implementation for the CRM application, including backend permissions, frontend access control, and user management.

## Roles and Permissions

### Role Hierarchy

1. **Staff** - View-only access
2. **Engineer** - View + Create/Update own cases
3. **Manager** - View + Create/Update + Assign + Manage master data
4. **Admin** - Full access including user management

### Permission Matrix

| Permission | Staff | Engineer | Manager | Admin |
|------------|-------|----------|---------|-------|
| **DTR** |
| `dtr:view` | ✅ | ✅ | ✅ | ✅ |
| `dtr:create` | ❌ | ✅ | ✅ | ✅ |
| `dtr:update` | ❌ | ✅* | ✅ | ✅ |
| `dtr:assign` | ❌ | ❌ | ✅ | ✅ |
| `dtr:close` | ❌ | ❌ | ✅ | ✅ |
| `dtr:delete` | ❌ | ❌ | ❌ | ✅ |
| **RMA** |
| `rma:view` | ✅ | ✅ | ✅ | ✅ |
| `rma:create` | ❌ | ✅ | ✅ | ✅ |
| `rma:update` | ❌ | ✅* | ✅ | ✅ |
| `rma:assign` | ❌ | ❌ | ✅ | ✅ |
| `rma:update_status` | ❌ | ❌ | ✅ | ✅ |
| `rma:update_tracking` | ❌ | ❌ | ✅ | ✅ |
| `rma:email_client` | ❌ | ❌ | ✅ | ✅ |
| `rma:delete` | ❌ | ❌ | ❌ | ✅ |
| **Master Data** |
| `master:view` | ✅ | ✅ | ✅ | ✅ |
| `master:create` | ❌ | ❌ | ✅ | ✅ |
| `master:update` | ❌ | ❌ | ✅ | ✅ |
| `master:delete` | ❌ | ❌ | ❌ | ✅ |
| **Analytics** |
| `analytics:view` | ✅ | ✅ | ✅ | ✅ |
| **Users** |
| `users:view` | ❌ | ❌ | ✅ | ✅ |
| `users:create` | ❌ | ❌ | ❌ | ✅ |
| `users:update` | ❌ | ❌ | ❌ | ✅ |
| `users:delete` | ❌ | ❌ | ❌ | ✅ |
| **Parts** |
| `parts:view` | ✅ | ✅ | ✅ | ✅ |
| `parts:create` | ❌ | ❌ | ✅ | ✅ |
| `parts:update` | ❌ | ❌ | ✅ | ✅ |
| `parts:delete` | ❌ | ❌ | ❌ | ✅ |
| **Models** |
| `models:view` | ✅ | ✅ | ✅ | ✅ |
| `models:create` | ❌ | ❌ | ✅ | ✅ |
| `models:update` | ❌ | ❌ | ✅ | ✅ |
| `models:delete` | ❌ | ❌ | ❌ | ✅ |

*Engineers can only update cases assigned to them

## Backend Implementation

### Files Created/Modified

1. **`backend/src/utils/permissions.util.ts`**
   - Defines all permissions and role-permission mappings
   - Provides utility functions: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`

2. **`backend/src/middleware/role.middleware.ts`**
   - Enhanced with permission-based middleware:
     - `requirePermission(...permissions)` - Requires any of the specified permissions
     - `requireAllPermissions(...permissions)` - Requires all specified permissions
     - `requireRole(...roles)` - Requires specific role(s)

3. **Route Protection**
   - All routes updated to use permission-based middleware:
     - `backend/src/routes/dtr.routes.ts`
     - `backend/src/routes/rma.routes.ts`
     - `backend/src/routes/masterData.routes.ts`
     - `backend/src/routes/user.routes.ts`
     - `backend/src/routes/analytics.routes.ts`
     - `backend/src/routes/parts.routes.ts`

### Example: Protected Route

```typescript
// Before
router.post('/', createDtrCase);

// After
router.post('/', requirePermission('dtr:create'), createDtrCase);
```

## Frontend Implementation

### Files Created

1. **`src/utils/permissions.ts`**
   - Mirrors backend permissions system
   - Same permission definitions and role mappings

2. **`src/hooks/usePermissions.ts`**
   - React hook for checking permissions
   - Provides: `can()`, `canAny()`, `canAll()`, `isRole()`, `isAdmin()`, `isManager()`, `isEngineer()`

3. **`src/components/ProtectedComponent.tsx`**
   - Wrapper component for conditional rendering based on permissions/roles

### Files Modified

1. **`src/App.tsx`**
   - Navigation items filtered based on user permissions
   - Only shows tabs user has access to

2. **`src/components/DTRList.tsx`**
   - "New DTR Case" button protected with `dtr:create` permission

3. **`src/components/RMAList.tsx`**
   - "New RMA Case" button protected with `rma:create` permission

4. **`src/components/UserManagement.tsx`**
   - "Add User" button protected with `users:create` permission
   - Edit/Delete buttons protected with respective permissions

### Usage Examples

#### Using the Hook

```typescript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { can, isAdmin, isManager } = usePermissions();

  return (
    <div>
      {can('dtr:create') && (
        <button>Create DTR Case</button>
      )}
      
      {isAdmin && (
        <button>Admin Only Action</button>
      )}
    </div>
  );
}
```

#### Using ProtectedComponent

```typescript
import { ProtectedComponent } from './ProtectedComponent';

function MyComponent() {
  return (
    <ProtectedComponent permission="dtr:create">
      <button>Create DTR Case</button>
    </ProtectedComponent>
  );
}
```

#### Multiple Permissions

```typescript
<ProtectedComponent 
  permissions={['dtr:assign', 'dtr:close']} 
  requireAll={false}  // User needs ANY of these
>
  <button>Action</button>
</ProtectedComponent>
```

## User Management

### Creating Users

1. **Admin Only**: Only users with `admin` role can create new users
2. **Registration Endpoint**: `/api/auth/register` allows role specification (defaults to 'staff')
3. **User Management UI**: Available only to admins

### User Roles

- **Staff**: Basic view-only access
- **Engineer**: Can create and update cases assigned to them
- **Manager**: Can assign cases, manage master data, view users
- **Admin**: Full system access including user management

### Best Practices

1. **Always check permissions on both frontend and backend**
   - Frontend: For UI/UX (hiding buttons, etc.)
   - Backend: For security (enforcing access control)

2. **Use permission-based checks over role-based when possible**
   - More granular and maintainable
   - Easier to add new roles without code changes

3. **Engineers can only update their own cases**
   - Backend should validate case ownership
   - Frontend should show appropriate UI restrictions

## Testing RBAC

### Test Scenarios

1. **Staff User**
   - ✅ Can view DTR/RMA cases
   - ✅ Can view analytics
   - ❌ Cannot create cases
   - ❌ Cannot see "Add User" button

2. **Engineer User**
   - ✅ Can create DTR/RMA cases
   - ✅ Can update assigned cases
   - ❌ Cannot assign cases to others
   - ❌ Cannot close cases

3. **Manager User**
   - ✅ Can assign cases
   - ✅ Can close cases
   - ✅ Can manage master data
   - ✅ Can view users
   - ❌ Cannot create/delete users

4. **Admin User**
   - ✅ Full access to all features
   - ✅ Can manage users
   - ✅ Can delete cases

## API Endpoints Protection

All endpoints are protected with appropriate permissions:

- **GET** endpoints: Require `view` permission
- **POST** endpoints: Require `create` permission
- **PUT** endpoints: Require `update` permission
- **DELETE** endpoints: Require `delete` permission
- **Special actions**: Require specific permissions (e.g., `assign`, `close`)

## Security Notes

1. **Backend is the source of truth** - Frontend permissions are for UX only
2. **JWT tokens** include user role for authorization
3. **All API calls** are validated against permissions
4. **Engineers** can only update cases assigned to them (backend validation needed)

## Future Enhancements

1. **Resource-level permissions**: Fine-grained control (e.g., per-site access)
2. **Custom roles**: Allow admins to create custom roles with specific permissions
3. **Permission groups**: Group related permissions for easier management
4. **Audit logging**: Track permission checks and access attempts

## Migration Notes

- Existing users will need to be assigned appropriate roles
- Default role for new registrations is 'staff'
- Admin users should be created manually or via database migration



