# ⚡ Email Communication - Quick Implementation Guide

This guide provides step-by-step instructions for implementing the most critical email improvements.

---

## 🎯 **Quick Wins (Implement First)**

### 1. **Improve Email Templates** (2 hours)

**File:** `backend/src/utils/emailTemplates.ts` (create new)

```typescript
export function generateAssignmentEmailHTML(data: {
  engineerName: string;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  siteName?: string;
  severity?: string;
  createdBy?: string;
  link?: string;
}) {
  const severityColor = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  }[data.severity || 'low'] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">New Case Assignment</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${data.engineerName}</strong>,</p>
            <p style="font-size: 16px; margin: 0 0 20px 0;">You have been assigned a new <strong>${data.caseType}</strong> case.</p>
            
            <!-- Case Details Card -->
            <div style="background: #f9fafb; border-left: 4px solid #1d4ed8; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280; width: 140px;">Case Number:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.caseNumber}</td>
                </tr>
                ${data.siteName ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Site:</td>
                  <td style="padding: 8px 0; color: #111827;">${data.siteName}</td>
                </tr>
                ` : ''}
                ${data.severity ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Severity:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                      ${data.severity}
                    </span>
                  </td>
                </tr>
                ` : ''}
                ${data.createdBy ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Created By:</td>
                  <td style="padding: 8px 0; color: #111827;">${data.createdBy}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- CTA Button -->
            ${data.link ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" 
                 style="background: #1d4ed8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                View Case Details →
              </a>
            </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              This is an automated email from CRM System
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">
              <a href="#" style="color: #1d4ed8; text-decoration: none;">Email Preferences</a> | 
              <a href="#" style="color: #1d4ed8; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

**Update:** `backend/src/utils/email.util.ts`
```typescript
import { generateAssignmentEmailHTML } from './emailTemplates';

// In sendAssignmentEmail function, replace:
const html = textLines.map(...).join('\n');

// With:
const html = generateAssignmentEmailHTML({
  engineerName: greetingName,
  caseType: payload.caseType,
  caseNumber: payload.caseNumber,
  siteName: payload.siteName, // Add to payload
  severity: payload.severity, // Add to payload
  createdBy: payload.createdBy,
  link: payload.link,
});
```

---

### 2. **Add More Email Types** (4 hours)

**Add to:** `backend/src/utils/email.util.ts`

```typescript
// Status Change Email
export async function sendStatusChangeEmail(payload: {
  to: string;
  userName: string;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  oldStatus: string;
  newStatus: string;
  link?: string;
}) {
  // Implementation similar to sendAssignmentEmail
}

// Case Closed Email
export async function sendCaseClosedEmail(payload: {
  to: string;
  userName: string;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  closedBy: string;
  link?: string;
}) {
  // Implementation
}

// Case Comment Email
export async function sendCaseCommentEmail(payload: {
  to: string;
  userName: string;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  commentedBy: string;
  comment: string;
  link?: string;
}) {
  // Implementation
}
```

**Update controllers to send emails:**
- In `dtr.controller.ts` - when status changes
- In `rma.controller.ts` - when status changes
- When cases are closed
- When comments are added

---

### 3. **Add Email Logging** (3 hours)

**Add to:** `backend/prisma/schema.prisma`

```prisma
model EmailLog {
  id          String      @id @default(uuid())
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  caseId      String?
  caseType    CaseType?
  to          String
  subject     String
  template    String
  status      EmailStatus @default(pending)
  sentAt      DateTime?
  error       String?     @db.Text
  messageId   String?
  createdAt   DateTime    @default(now())
  
  @@index([userId])
  @@index([caseId, caseType])
  @@index([status])
  @@index([createdAt])
  @@map("email_logs")
}

enum EmailStatus {
  pending
  sent
  failed
  bounced
}
```

**Update User model:**
```prisma
model User {
  // ... existing fields
  emailLogs   EmailLog[]
}
```

**Create:** `backend/src/utils/emailLogger.util.ts`
```typescript
import { prisma } from './prisma.util';

export async function logEmail(data: {
  userId?: string;
  caseId?: string;
  caseType?: 'DTR' | 'RMA';
  to: string;
  subject: string;
  template: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  messageId?: string;
  error?: string;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        userId: data.userId,
        caseId: data.caseId,
        caseType: data.caseType,
        to: data.to,
        subject: data.subject,
        template: data.template,
        status: data.status,
        messageId: data.messageId,
        error: data.error,
        sentAt: data.status === 'sent' ? new Date() : null,
      },
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}
```

**Update email functions to log:**
```typescript
// Before sending
await logEmail({
  userId: assigneeId,
  caseId: caseId,
  caseType: 'DTR',
  to: email,
  subject: subject,
  template: 'assignment',
  status: 'pending',
});

// After sending
await logEmail({
  // ... same data
  status: 'sent',
  messageId: info.messageId,
});

// On error
await logEmail({
  // ... same data
  status: 'failed',
  error: error.message,
});
```

---

### 4. **Add Email Preferences Model** (2 hours)

**Add to:** `backend/prisma/schema.prisma`

```prisma
model EmailPreferences {
  id                String         @id @default(uuid())
  userId            String         @unique
  user              User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Notification types
  caseAssigned      Boolean        @default(true)
  caseStatusChanged Boolean        @default(true)
  caseReassigned    Boolean        @default(true)
  caseClosed        Boolean        @default(true)
  caseCommented     Boolean        @default(true)
  caseEscalated     Boolean        @default(true)
  dailySummary      Boolean        @default(false)
  weeklyReport      Boolean        @default(false)
  
  // Frequency
  emailFrequency    EmailFrequency @default(immediate)
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  @@map("email_preferences")
}

enum EmailFrequency {
  immediate
  daily_digest
  weekly_digest
  never
}
```

**Update User model:**
```prisma
model User {
  // ... existing fields
  emailPreferences EmailPreferences?
}
```

**Create:** `backend/src/controllers/emailPreferences.controller.ts`
```typescript
// Get user email preferences
export async function getEmailPreferences(req: AuthRequest, res: Response) {
  // Implementation
}

// Update user email preferences
export async function updateEmailPreferences(req: AuthRequest, res: Response) {
  // Implementation
}
```

**Create:** `backend/src/routes/emailPreferences.routes.ts`
```typescript
router.get('/', authenticateToken, getEmailPreferences);
router.put('/', authenticateToken, updateEmailPreferences);
```

---

## 📝 **Implementation Checklist**

### Phase 1: Quick Wins
- [ ] Create email templates file
- [ ] Improve assignment email HTML
- [ ] Add status change email function
- [ ] Add case closed email function
- [ ] Add case comment email function
- [ ] Update controllers to send new email types
- [ ] Create EmailLog model
- [ ] Create email logger utility
- [ ] Update email functions to log
- [ ] Create EmailPreferences model
- [ ] Create email preferences controller
- [ ] Create email preferences routes
- [ ] Run Prisma migration

### Phase 2: Advanced Features
- [ ] Set up email queue (Bull + Redis)
- [ ] Implement email retry logic
- [ ] Add scheduled email reports
- [ ] Create email history UI
- [ ] Create email preferences UI

---

## 🚀 **Next Steps**

1. **Start with Quick Wins** - Implement templates and logging first
2. **Test thoroughly** - Send test emails to yourself
3. **Add more email types** - Based on your workflow needs
4. **Implement preferences** - Give users control
5. **Set up queue** - For production scalability

---

**Ready to implement?** Start with the email templates improvement - it's the quickest win with the biggest impact!

