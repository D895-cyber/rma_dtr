# User Deletion Troubleshooting Guide

## Issue: Unable to Delete Engineer User

### Possible Causes

1. **Permission Issue**: You must be logged in as an **Admin** to delete users
2. **Related Records**: User has DTR/RMA cases, audit logs, or notifications
3. **Self-Deletion Prevention**: Cannot delete your own account
4. **Database Constraints**: Foreign key constraints preventing deletion

## Solutions Implemented

### Backend Changes

1. **Smart Deletion Logic**:
   - If user has related records → **Deactivates** the user instead of deleting
   - If no related records → **Deletes** the user completely
   - Prevents self-deletion with clear error message

2. **Better Error Handling**:
   - Checks for related DTR cases (created/assigned)
   - Checks for related RMA cases (created/assigned)
   - Handles database constraint errors gracefully

### Frontend Changes

1. **Visual Feedback**:
   - Disabled button styling when you can't delete your own account
   - Tooltip explaining why button is disabled
   - Better success/error messages

## How to Delete a User

### Step 1: Verify Your Role
- You must be logged in as an **Admin** user
- Check your role in the header (top right of the screen)

### Step 2: Check User's Related Records
If the user has:
- Created DTR cases
- Assigned DTR cases
- Created RMA cases
- Assigned RMA cases

**Result**: User will be **deactivated** instead of deleted (preserves data integrity)

### Step 3: Delete/Deactivate
1. Go to **Users** tab (Admin only)
2. Find the user you want to delete
3. Click the red **trash icon**
4. Confirm the deletion

**Note**: If user has related records, you'll see a message: "User deactivated successfully (has related records)"

## Troubleshooting Steps

### 1. Check Your Permissions
```javascript
// In browser console, check your role:
localStorage.getItem('auth_token')
// Decode JWT to see your role
```

Or check the header - it should show "Admin" next to your name.

### 2. Check User Status
- If user is already inactive, you might want to reactivate them first
- Inactive users are shown with a red "Inactive" badge

### 3. Check Browser Console
- Open Developer Tools (F12)
- Check Console tab for error messages
- Check Network tab to see API response

### 4. Check Backend Logs
Look for error messages like:
- "Foreign key constraint"
- "User has related records"
- "Cannot delete your own account"

## Manual Database Deletion (Advanced)

If you need to force delete a user (not recommended):

```sql
-- First, check related records
SELECT COUNT(*) FROM dtr_cases WHERE created_by = 'user-id';
SELECT COUNT(*) FROM dtr_cases WHERE assigned_to = 'user-id';
SELECT COUNT(*) FROM rma_cases WHERE created_by = 'user-id';
SELECT COUNT(*) FROM rma_cases WHERE assigned_to = 'user-id';

-- Option 1: Deactivate (recommended)
UPDATE users SET active = false WHERE id = 'user-id';

-- Option 2: Delete related records first (dangerous!)
-- This will lose data history
DELETE FROM audit_logs WHERE performed_by = 'user-id';
DELETE FROM notifications WHERE user_id = 'user-id';
-- Then update cases to remove user references
UPDATE dtr_cases SET assigned_to = NULL WHERE assigned_to = 'user-id';
UPDATE rma_cases SET assigned_to = NULL WHERE assigned_to = 'user-id';
-- Finally delete user
DELETE FROM users WHERE id = 'user-id';
```

## Best Practice

**Instead of deleting users with history, deactivate them:**
- Preserves audit trail
- Maintains data integrity
- Can be reactivated if needed
- Shows in user list as "Inactive"

## Testing the Fix

1. **Test as Admin**:
   - Login as admin
   - Try to delete an engineer user
   - Should work or show deactivation message

2. **Test Self-Deletion Prevention**:
   - Try to delete your own account
   - Should show error: "Cannot delete your own account"

3. **Test with Related Records**:
   - Create a DTR case assigned to an engineer
   - Try to delete that engineer
   - Should deactivate instead of delete

## Still Having Issues?

1. **Check API Response**:
   - Open Network tab in DevTools
   - Look for DELETE request to `/api/users/:id`
   - Check response status and message

2. **Verify Backend is Running**:
   - Check backend server logs
   - Ensure database connection is working

3. **Check User ID**:
   - Verify the user ID is correct
   - Check if user exists in database

4. **Contact Support**:
   - Share error messages from console
   - Share backend logs
   - Share network request/response details



