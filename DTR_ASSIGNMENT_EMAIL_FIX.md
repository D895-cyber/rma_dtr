# DTR Assignment Email Not Sending - Issue Analysis & Fix

## Problem
Emails are not being sent when a DTR case is assigned to an engineer.

## Root Causes

### 1. **Email Configuration Missing**
The email utility checks for Gmail OAuth environment variables. If they're not configured, emails are silently skipped.

**Check:** Backend logs should show:
```
[Email] Email not sent: Gmail OAuth2 env vars not configured
```

**Required Environment Variables:**
- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `GMAIL_OAUTH_REFRESH_TOKEN`
- `GMAIL_OAUTH_USER`

### 2. **Assignment Change Detection Issue**
The backend compares UUIDs to detect assignment changes, but there's a potential issue:

**Current Logic (line 353 in `dtr.controller.ts`):**
```typescript
if (updateData.assignedTo && updateData.assignedTo !== currentCase.assignedTo && dtrCase.assignee?.email) {
  // Send email
}
```

**Potential Issues:**
- If `updateData.assignedTo` is sent as an empty string `""`, it won't pass the first check
- If `currentCase.assignedTo` is `null` and `updateData.assignedTo` is also `null` (after conversion), the comparison fails
- The comparison happens AFTER conversion, but if the email-to-UUID conversion fails silently, the comparison might not work

### 3. **Frontend Sending Unchanged Assignment**
When the form is saved via `handleUpdate()`, it sends the entire `formData` object, including `assignedTo` even if it hasn't changed. This might cause the comparison to fail if:
- The original assignment is a UUID
- The form sends it as an email
- After conversion, they're the same UUID, so no change is detected

## Solutions

### Solution 1: Fix Assignment Change Detection

**Problem:** The comparison needs to happen BEFORE conversion, or we need to store the original email for comparison.

**Fix in `backend/src/controllers/dtr.controller.ts`:**

```typescript
// Update DTR case
export async function updateDtrCase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get the current case to check for assignment changes
    const currentCase = await prisma.dtrCase.findUnique({
      where: { id },
      select: { assignedTo: true, caseNumber: true },
    });

    if (!currentCase) {
      return sendError(res, 'DTR case not found', 404);
    }

    // Store original assignedTo for comparison (before conversion)
    const originalAssignedTo = currentCase.assignedTo;
    const newAssignedToEmail = updateData.assignedTo; // Store email before conversion

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.caseNumber;
    delete updateData.createdBy;
    delete updateData.createdAt;
    
    // Remove nested objects
    delete updateData.site;
    delete updateData.audi;
    delete updateData.creator;
    delete updateData.assignee;
    delete updateData.closer;
    delete updateData.auditLog;
    delete updateData.auditLogs;

    // Handle assignedTo: convert email to user ID if needed
    let newAssignedToUserId: string | null = null;
    if (updateData.assignedTo) {
      // Check if assignedTo is an email or user ID
      if (typeof updateData.assignedTo === 'string' && updateData.assignedTo.includes('@')) {
        // It's an email, find the user
        const user = await prisma.user.findUnique({
          where: { email: updateData.assignedTo },
          select: { id: true },
        });
        
        if (!user) {
          return sendError(res, `User with email ${updateData.assignedTo} not found`, 404);
        }
        
        newAssignedToUserId = user.id;
        updateData.assignedTo = user.id;
      } else {
        // It's already a user ID
        newAssignedToUserId = updateData.assignedTo;
      }
    }

    // Convert date if present
    if (updateData.errorDate) {
      updateData.errorDate = new Date(updateData.errorDate);
    }

    const dtrCase = await prisma.dtrCase.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        audi: {
          include: {
            projector: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Updated',
        description: `DTR case updated by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email if assignedTo changed
    // Compare the UUIDs (after conversion) to detect actual changes
    const assignmentChanged = newAssignedToUserId !== originalAssignedTo;
    
    if (assignmentChanged && newAssignedToUserId && dtrCase.assignee?.email) {
      console.log(`[DTR] Assignment changed: ${originalAssignedTo} -> ${newAssignedToUserId}`);
      
      await prisma.notification.create({
        data: {
          userId: newAssignedToUserId,
          title: 'DTR Case Assigned',
          message: `You have been assigned to DTR Case #${dtrCase.caseNumber}`,
          type: 'assignment',
          caseId: dtrCase.id,
          caseType: 'DTR',
        },
      });

      sendAssignmentEmail({
        to: dtrCase.assignee.email,
        engineerName: dtrCase.assignee.name,
        caseType: 'DTR',
        caseNumber: dtrCase.caseNumber,
        createdBy: dtrCase.creator?.email,
      }).catch((err) => {
        console.error('DTR reassignment email error:', err);
      });
    } else {
      if (!assignmentChanged) {
        console.log(`[DTR] Assignment not changed: ${originalAssignedTo} === ${newAssignedToUserId}`);
      }
      if (!newAssignedToUserId) {
        console.log(`[DTR] No new assignment provided`);
      }
      if (!dtrCase.assignee?.email) {
        console.log(`[DTR] Assignee email not found for case ${dtrCase.caseNumber}`);
      }
    }

    return sendSuccess(res, { case: dtrCase }, 'DTR case updated successfully');
  } catch (error: any) {
    console.error('Update DTR case error:', error);
    return sendError(res, 'Failed to update DTR case', 500, error.message);
  }
}
```

### Solution 2: Use Dedicated Assign Endpoint

**Better Approach:** Use the existing `/dtr/:id/assign` endpoint instead of updating through the general update endpoint.

**Frontend Fix in `DTRDetail.tsx`:**

Instead of using `handleUpdate()` when only assignment changes, use `handleAssign()`:

```typescript
// When assignment changes in the form
const handleAssignmentChange = async () => {
  if (formData.assignedTo) {
    // Use the dedicated assign endpoint
    await handleAssign(formData.assignedTo);
  } else {
    // If unassigning, use regular update
    onUpdate(dtr.id, { assignedTo: null }, currentUser.email, 'Unassigned', 'Case unassigned');
  }
};
```

### Solution 3: Check Email Configuration

**Verify email is configured:**

1. Check backend `.env` file has:
   ```
   GMAIL_OAUTH_CLIENT_ID=your_client_id
   GMAIL_OAUTH_CLIENT_SECRET=your_client_secret
   GMAIL_OAUTH_REFRESH_TOKEN=your_refresh_token
   GMAIL_OAUTH_USER=your_email@gmail.com
   ```

2. Check backend logs when assignment happens:
   - Look for `[Email] Attempting to send assignment email...`
   - Look for `[Email] Email not sent: Gmail OAuth2 env vars not configured`
   - Look for `[Email] Assignment email sent successfully...`

3. Test email configuration:
   ```typescript
   // Add a test endpoint in backend
   router.post('/test-email', async (req, res) => {
     try {
       await sendAssignmentEmail({
         to: 'test@example.com',
         engineerName: 'Test Engineer',
         caseType: 'DTR',
         caseNumber: 'TEST-001',
       });
       res.json({ success: true, message: 'Test email sent' });
     } catch (error) {
       res.status(500).json({ success: false, error: error.message });
     }
   });
   ```

## Recommended Fix Priority

1. **First:** Check email configuration (Solution 3)
2. **Second:** Fix assignment change detection (Solution 1)
3. **Third:** Use dedicated assign endpoint (Solution 2)

## Testing

After applying fixes:

1. **Test Assignment Change:**
   - Open a DTR case
   - Change assignment to a different engineer
   - Save
   - Check backend logs for email sending
   - Check engineer's email inbox

2. **Test New Assignment:**
   - Open an unassigned DTR case
   - Assign to an engineer
   - Save
   - Check email is sent

3. **Test No Change:**
   - Open a DTR case
   - Don't change assignment
   - Save
   - Verify no email is sent (correct behavior)

## Debugging

Add logging to track the issue:

```typescript
console.log('Assignment check:', {
  originalAssignedTo,
  newAssignedToEmail,
  newAssignedToUserId,
  assignmentChanged: newAssignedToUserId !== originalAssignedTo,
  assigneeEmail: dtrCase.assignee?.email,
});
```

This will help identify where the email sending is failing.





