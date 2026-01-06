# 🚀 Top 5 Features - Implementation Guide

This guide provides step-by-step instructions for implementing the 5 highest-priority features.

---

## 1. 📧 Smart Notifications (#4) - Email Notifications

### Overview
Send email notifications for important events like case assignments, status changes, and overdue cases.

### Implementation Steps

#### **Step 1: Backend - Email Service Enhancement**

**File:** `backend/src/utils/email.util.ts`

```typescript
// Add new notification types
export async function sendCaseAssignedEmail(
  to: string,
  caseType: 'DTR' | 'RMA',
  caseNumber: string,
  caseDetails: string
) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `New ${caseType} Case Assigned: ${caseNumber}`,
    html: `
      <h2>New Case Assigned</h2>
      <p>You have been assigned a new ${caseType} case:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Details:</strong> ${caseDetails}</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/#${caseType.toLowerCase()}">View Case</a></p>
    `,
  };
  // ... send email
}

export async function sendStatusChangeEmail(
  to: string,
  caseType: 'DTR' | 'RMA',
  caseNumber: string,
  oldStatus: string,
  newStatus: string
) {
  // ... implementation
}

export async function sendOverdueCaseEmail(
  to: string,
  caseType: 'DTR' | 'RMA',
  caseNumber: string,
  daysOverdue: number
) {
  // ... implementation
}
```

#### **Step 2: Backend - Notification Preferences Model**

**File:** `backend/prisma/schema.prisma`

```prisma
model NotificationPreference {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Email preferences
  emailCaseAssigned     Boolean @default(true)
  emailStatusChanged    Boolean @default(true)
  emailOverdueAlert     Boolean @default(true)
  emailEscalation       Boolean @default(true)
  emailCommentAdded     Boolean @default(false)
  
  // In-app preferences
  inAppCaseAssigned     Boolean @default(true)
  inAppStatusChanged    Boolean @default(true)
  inAppOverdueAlert     Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId])
  @@map("notification_preferences")
}
```

**Migration:**
```bash
cd backend
npx prisma migrate dev --name add_notification_preferences
```

#### **Step 3: Backend - Add Notification Triggers**

**File:** `backend/src/controllers/dtr.controller.ts`

```typescript
// In createDtrCase function, after creating case:
if (assignedTo) {
  const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
  if (assignee) {
    const prefs = await getNotificationPreferences(assignedTo);
    if (prefs?.emailCaseAssigned) {
      await sendCaseAssignedEmail(
        assignee.email,
        'DTR',
        newCase.caseNumber,
        newCase.natureOfProblem
      );
    }
  }
}

// In updateDtrStatus function:
if (oldStatus !== newStatus) {
  const prefs = await getNotificationPreferences(dtrCase.assignedTo);
  if (prefs?.emailStatusChanged) {
    // Send status change email
  }
}
```

#### **Step 4: Frontend - Notification Preferences UI**

**File:** `src/components/NotificationPreferences.tsx` (NEW)

```typescript
export function NotificationPreferences({ currentUser }) {
  const [preferences, setPreferences] = useState({...});
  
  // Load and save preferences
  // UI with checkboxes for each notification type
}
```

#### **Step 5: Frontend - In-App Notifications**

**File:** `src/components/Notifications.tsx` (ENHANCE)

```typescript
// Add real-time notification updates
// Show notification count badge
// Mark as read functionality
```

---

## 2. 📋 Case Templates (#6) - Speed Up Case Creation

### Overview
Pre-filled templates for common issues to speed up case creation.

### Implementation Steps

#### **Step 1: Database Schema**

**File:** `backend/prisma/schema.prisma`

```prisma
model CaseTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  caseType    String   // 'DTR' or 'RMA'
  
  // Template data (JSON field)
  templateData Json
  
  // Metadata
  createdBy   String
  creator     User     @relation(fields: [createdBy], references: [id])
  isPublic    Boolean  @default(false) // Public templates available to all
  usageCount  Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("case_templates")
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_case_templates
```

#### **Step 2: Backend - Template API**

**File:** `backend/src/controllers/template.controller.ts` (NEW)

```typescript
// Get all templates
export async function getTemplates(req: AuthRequest, res: Response) {
  const { caseType } = req.query;
  const templates = await prisma.caseTemplate.findMany({
    where: {
      OR: [
        { isPublic: true },
        { createdBy: req.user.id }
      ],
      ...(caseType && { caseType })
    },
    orderBy: { usageCount: 'desc' }
  });
  return sendSuccess(res, { templates });
}

// Create template
export async function createTemplate(req: AuthRequest, res: Response) {
  const { name, description, caseType, templateData } = req.body;
  const template = await prisma.caseTemplate.create({
    data: {
      name,
      description,
      caseType,
      templateData,
      createdBy: req.user.id
    }
  });
  return sendSuccess(res, { template });
}

// Use template (increment usage count)
export async function useTemplate(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.caseTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } }
  });
  const template = await prisma.caseTemplate.findUnique({ where: { id } });
  return sendSuccess(res, { template });
}
```

#### **Step 3: Backend - Routes**

**File:** `backend/src/routes/template.routes.ts` (NEW)

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import * as templateController from '../controllers/template.controller';

const router = Router();

router.get('/', authenticateToken, templateController.getTemplates);
router.post('/', authenticateToken, requirePermission('cases:create'), templateController.createTemplate);
router.get('/:id', authenticateToken, templateController.getTemplateById);
router.post('/:id/use', authenticateToken, templateController.useTemplate);
router.delete('/:id', authenticateToken, requirePermission('cases:create'), templateController.deleteTemplate);

export default router;
```

#### **Step 4: Frontend - Template Service**

**File:** `src/services/template.service.ts` (NEW)

```typescript
import api from './api';

export const templateService = {
  async getTemplates(caseType?: string) {
    const query = caseType ? `?caseType=${caseType}` : '';
    return await api.get(`/templates${query}`);
  },
  
  async createTemplate(data: any) {
    return await api.post('/templates', data);
  },
  
  async useTemplate(id: string) {
    return await api.post(`/templates/${id}/use`);
  }
};
```

#### **Step 5: Frontend - Template UI in Forms**

**File:** `src/components/DTRForm.tsx`

```typescript
// Add template selector at top of form
const [templates, setTemplates] = useState([]);
const [selectedTemplate, setSelectedTemplate] = useState('');

// Load templates on mount
useEffect(() => {
  templateService.getTemplates('DTR').then(res => {
    if (res.success) setTemplates(res.data.templates);
  });
}, []);

// Apply template
const applyTemplate = (templateId: string) => {
  const template = templates.find(t => t.id === templateId);
  if (template) {
    setFormData({ ...formData, ...template.templateData });
    templateService.useTemplate(templateId);
  }
};

// In JSX:
<select onChange={(e) => applyTemplate(e.target.value)}>
  <option value="">Select Template...</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>{t.name}</option>
  ))}
</select>
```

#### **Step 6: Frontend - Template Management**

**File:** `src/components/TemplateManagement.tsx` (NEW)

```typescript
// UI to create, edit, delete templates
// Show template usage statistics
// Public/private toggle
```

---

## 3. 🔍 Advanced Search & Filters (#8) - Improve Productivity

### Overview
Saved searches, multi-criteria filtering, and search history.

### Implementation Steps

#### **Step 1: Database Schema**

**File:** `backend/prisma/schema.prisma`

```prisma
model SavedSearch {
  id          String   @id @default(uuid())
  name        String
  description String?
  caseType    String   // 'DTR' or 'RMA' or 'ALL'
  
  // Search criteria (JSON)
  filters     Json
  
  // Metadata
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  isPublic    Boolean  @default(false)
  usageCount  Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("saved_searches")
}
```

#### **Step 2: Backend - Saved Search API**

**File:** `backend/src/controllers/search.controller.ts` (NEW)

```typescript
export async function getSavedSearches(req: AuthRequest, res: Response) {
  const searches = await prisma.savedSearch.findMany({
    where: {
      OR: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    },
    orderBy: { usageCount: 'desc' }
  });
  return sendSuccess(res, { searches });
}

export async function saveSearch(req: AuthRequest, res: Response) {
  const { name, description, caseType, filters } = req.body;
  const search = await prisma.savedSearch.create({
    data: {
      name,
      description,
      caseType,
      filters,
      userId: req.user.id
    }
  });
  return sendSuccess(res, { search });
}
```

#### **Step 3: Frontend - Saved Search Component**

**File:** `src/components/SavedSearches.tsx` (NEW)

```typescript
export function SavedSearches({ caseType, onApplySearch }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Load saved searches
  // Display as dropdown or list
  // Apply search when clicked
  // Save current filters as new search
}
```

#### **Step 4: Frontend - Enhanced Filter UI**

**File:** `src/components/DTRList.tsx` & `src/components/RMAList.tsx`

```typescript
// Add "Save Search" button when filters are active
// Add "Saved Searches" dropdown
// Add search history (localStorage)
// Add "Clear All Filters" button
// Show active filter badges
```

#### **Step 5: Search History (LocalStorage)**

**File:** `src/utils/searchHistory.ts` (NEW)

```typescript
const SEARCH_HISTORY_KEY = 'crm_search_history';
const MAX_HISTORY = 10;

export const searchHistory = {
  save(caseType: string, filters: any) {
    const history = this.load();
    const newEntry = { caseType, filters, timestamp: Date.now() };
    const filtered = history.filter(h => 
      h.caseType !== caseType || JSON.stringify(h.filters) !== JSON.stringify(filters)
    );
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  },
  
  load() {
    const data = localStorage.getItem(SEARCH_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  clear() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }
};
```

---

## 4. 🤖 Auto-Assignment Rules (#13) - Reduce Manual Work

### Overview
Automatically assign cases based on configurable rules.

### Implementation Steps

#### **Step 1: Database Schema**

**File:** `backend/prisma/schema.prisma`

```prisma
model AssignmentRule {
  id          String   @id @default(uuid())
  name        String
  description String?
  caseType    String   // 'DTR' or 'RMA'
  isActive    Boolean  @default(true)
  priority    Int      @default(0) // Higher priority = checked first
  
  // Rule conditions (JSON)
  conditions  Json     // e.g., { siteId: "xxx", severity: "high" }
  
  // Assignment action
  assignTo    String?  // User ID or 'round-robin' or 'least-busy'
  assignToRole String? // Role name
  
  // Metadata
  createdBy   String
  creator     User     @relation(fields: [createdBy], references: [id])
  matchCount  Int      @default(0) // Track how many times rule matched
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("assignment_rules")
}
```

#### **Step 2: Backend - Rule Engine**

**File:** `backend/src/utils/assignmentRule.util.ts` (NEW)

```typescript
export async function findMatchingRule(
  caseType: 'DTR' | 'RMA',
  caseData: any
): Promise<AssignmentRule | null> {
  const rules = await prisma.assignmentRule.findMany({
    where: {
      caseType,
      isActive: true
    },
    orderBy: { priority: 'desc' }
  });
  
  for (const rule of rules) {
    if (matchesConditions(rule.conditions, caseData)) {
      // Increment match count
      await prisma.assignmentRule.update({
        where: { id: rule.id },
        data: { matchCount: { increment: 1 } }
      });
      return rule;
    }
  }
  return null;
}

function matchesConditions(conditions: any, caseData: any): boolean {
  // Check if case data matches all conditions
  for (const [key, value] of Object.entries(conditions)) {
    if (caseData[key] !== value) return false;
  }
  return true;
}

export async function getAssignedUser(rule: AssignmentRule): Promise<string | null> {
  if (rule.assignTo) {
    return rule.assignTo;
  }
  
  if (rule.assignToRole) {
    // Get user with least cases assigned
    const users = await prisma.user.findMany({
      where: { role: rule.assignToRole, active: true }
    });
    
    // Count cases per user
    const caseCounts = await Promise.all(
      users.map(async (user) => {
        const count = await prisma.dtrCase.count({
          where: { assignedTo: user.id, callStatus: { not: 'closed' } }
        });
        return { userId: user.id, count };
      })
    );
    
    // Return user with least cases
    const leastBusy = caseCounts.reduce((min, curr) => 
      curr.count < min.count ? curr : min
    );
    return leastBusy.userId;
  }
  
  return null;
}
```

#### **Step 3: Backend - Apply Rules in Controllers**

**File:** `backend/src/controllers/dtr.controller.ts`

```typescript
// In createDtrCase function:
if (!assignedTo) {
  // Try to auto-assign
  const rule = await findMatchingRule('DTR', {
    siteId: siteId,
    caseSeverity: caseSeverity,
    // ... other case data
  });
  
  if (rule) {
    const autoAssignedTo = await getAssignedUser(rule);
    if (autoAssignedTo) {
      assignedTo = autoAssignedTo;
    }
  }
}
```

#### **Step 4: Backend - Rule Management API**

**File:** `backend/src/controllers/rule.controller.ts` (NEW)

```typescript
export async function getRules(req: AuthRequest, res: Response) {
  const rules = await prisma.assignmentRule.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
  });
  return sendSuccess(res, { rules });
}

export async function createRule(req: AuthRequest, res: Response) {
  const { name, description, caseType, conditions, assignTo, assignToRole, priority } = req.body;
  const rule = await prisma.assignmentRule.create({
    data: {
      name,
      description,
      caseType,
      conditions,
      assignTo,
      assignToRole,
      priority: priority || 0,
      createdBy: req.user.id
    }
  });
  return sendSuccess(res, { rule });
}
```

#### **Step 5: Frontend - Rule Management UI**

**File:** `src/components/AssignmentRules.tsx` (NEW)

```typescript
// UI to create, edit, delete assignment rules
// Visual rule builder
// Test rule functionality
// Enable/disable rules
// View rule match statistics
```

---

## 5. 📎 File Attachments (#24) - Essential for Case Documentation

### Overview
Allow users to attach files (photos, documents, PDFs) to cases.

### Implementation Steps

#### **Step 1: Database Schema**

**File:** `backend/prisma/schema.prisma`

```prisma
model CaseAttachment {
  id          String   @id @default(uuid())
  fileName    String
  filePath    String   // Path on server
  fileSize    Int      // Bytes
  mimeType    String
  caseId      String
  caseType    String   // 'DTR' or 'RMA'
  
  // Metadata
  uploadedBy  String
  uploader    User     @relation(fields: [uploadedBy], references: [id])
  description String?
  
  createdAt   DateTime @default(now())

  @@map("case_attachments")
}
```

#### **Step 2: Backend - File Upload Middleware**

**File:** `backend/src/middleware/upload.middleware.ts` (NEW)

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
    }
  }
});
```

#### **Step 3: Backend - Attachment API**

**File:** `backend/src/controllers/attachment.controller.ts` (NEW)

```typescript
import { upload } from '../middleware/upload.middleware';
import { sendSuccess, sendError } from '../utils/response.util';

export const uploadAttachment = [
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }
      
      const { caseId, caseType, description } = req.body;
      
      const attachment = await prisma.caseAttachment.create({
        data: {
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          caseId,
          caseType,
          description,
          uploadedBy: req.user.id
        }
      });
      
      return sendSuccess(res, { attachment });
    } catch (error: any) {
      return sendError(res, 'Failed to upload file', 500, error.message);
    }
  }
];

export async function getAttachments(req: Request, res: Response) {
  const { caseId, caseType } = req.query;
  const attachments = await prisma.caseAttachment.findMany({
    where: {
      caseId: caseId as string,
      caseType: caseType as string
    },
    include: {
      uploader: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return sendSuccess(res, { attachments });
}

export async function deleteAttachment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const attachment = await prisma.caseAttachment.findUnique({
    where: { id }
  });
  
  if (!attachment) {
    return sendError(res, 'Attachment not found', 404);
  }
  
  // Delete file from disk
  if (fs.existsSync(attachment.filePath)) {
    fs.unlinkSync(attachment.filePath);
  }
  
  await prisma.caseAttachment.delete({
    where: { id }
  });
  
  return sendSuccess(res, null, 'Attachment deleted successfully');
}

export async function downloadAttachment(req: Request, res: Response) {
  const { id } = req.params;
  const attachment = await prisma.caseAttachment.findUnique({
    where: { id }
  });
  
  if (!attachment) {
    return sendError(res, 'Attachment not found', 404);
  }
  
  if (!fs.existsSync(attachment.filePath)) {
    return sendError(res, 'File not found on server', 404);
  }
  
  res.download(attachment.filePath, attachment.fileName);
}
```

#### **Step 4: Backend - Routes**

**File:** `backend/src/routes/attachment.routes.ts` (NEW)

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as attachmentController from '../controllers/attachment.controller';

const router = Router();

router.post('/upload', authenticateToken, attachmentController.uploadAttachment);
router.get('/', authenticateToken, attachmentController.getAttachments);
router.get('/:id/download', authenticateToken, attachmentController.downloadAttachment);
router.delete('/:id', authenticateToken, attachmentController.deleteAttachment);

export default router;
```

**File:** `backend/src/server.ts`

```typescript
// Add route
app.use('/api/attachments', attachmentRoutes);
```

#### **Step 5: Frontend - File Upload Component**

**File:** `src/components/FileUpload.tsx` (NEW)

```typescript
import { useState } from 'react';
import { Upload, X, File, Image } from 'lucide-react';

export function FileUpload({ caseId, caseType, onUploadComplete }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };
  
  const handleUpload = async () => {
    setUploading(true);
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('file', file);
    });
    formData.append('caseId', caseId);
    formData.append('caseType', caseType);
    
    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        setFiles([]);
        onUploadComplete?.();
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
      >
        <Upload className="w-4 h-4" />
        <span>Select Files</span>
      </label>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{file.name}</span>
              <button onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}
    </div>
  );
}
```

#### **Step 6: Frontend - Attachment List Component**

**File:** `src/components/AttachmentList.tsx` (NEW)

```typescript
export function AttachmentList({ caseId, caseType }) {
  const [attachments, setAttachments] = useState([]);
  
  // Load attachments
  // Display as list with download/delete buttons
  // Show file icons based on type
  // Show preview for images
}
```

#### **Step 7: Integrate into Case Forms**

**File:** `src/components/DTRForm.tsx` & `src/components/RMAForm.tsx`

```typescript
// Add FileUpload component
// Add AttachmentList component
// Show attachments in case detail view
```

#### **Step 8: Backend - Serve Static Files**

**File:** `backend/src/server.ts`

```typescript
import express from 'express';
import path from 'path';

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

---

## 📋 Implementation Checklist

### Feature 1: Smart Notifications
- [ ] Add NotificationPreference model
- [ ] Create email notification functions
- [ ] Add notification triggers in controllers
- [ ] Create notification preferences UI
- [ ] Enhance in-app notifications

### Feature 2: Case Templates
- [ ] Add CaseTemplate model
- [ ] Create template API
- [ ] Add template service (frontend)
- [ ] Add template selector in forms
- [ ] Create template management UI

### Feature 3: Advanced Search & Filters
- [ ] Add SavedSearch model
- [ ] Create search API
- [ ] Add saved search component
- [ ] Enhance filter UI
- [ ] Add search history (localStorage)

### Feature 4: Auto-Assignment Rules
- [ ] Add AssignmentRule model
- [ ] Create rule engine utility
- [ ] Integrate rules in controllers
- [ ] Create rule management API
- [ ] Build rule management UI

### Feature 5: File Attachments
- [ ] Add CaseAttachment model
- [ ] Create file upload middleware
- [ ] Create attachment API
- [ ] Build file upload component
- [ ] Build attachment list component
- [ ] Integrate into case forms
- [ ] Add file serving route

---

## 🚀 Quick Start Guide

### Step 1: Choose One Feature
Start with the feature that provides the most immediate value for your use case.

### Step 2: Database Migration
Run the migration for that feature's schema changes.

### Step 3: Backend Implementation
Implement the backend API and logic.

### Step 4: Frontend Implementation
Build the frontend components and integrate.

### Step 5: Test
Test thoroughly before moving to the next feature.

---

## 💡 Tips

1. **Start Small**: Implement one feature at a time
2. **Test Incrementally**: Test each step before moving forward
3. **Use Existing Patterns**: Follow the existing code structure
4. **Add Permissions**: Use the existing RBAC system for access control
5. **Error Handling**: Add proper error handling and user feedback

---

*Which feature would you like to implement first? I can help you with the detailed implementation!*

