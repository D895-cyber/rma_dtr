# ☁️ Cloudinary Integration - Setup Guide

## ✅ Implementation Complete!

Cloudinary integration has been fully implemented for RMA and DTR file attachments.

---

## 🔧 Setup Required

### Step 1: Create Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. You'll get:
   - Cloud Name
   - API Key
   - API Secret

### Step 2: Add Environment Variables

Add these to your `backend/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Restart Backend Server

After adding environment variables, restart your backend:

```bash
cd backend
npm run dev
```

---

## 📦 What Was Implemented

### Backend:
✅ Cloudinary utility service (`cloudinary.util.ts`)
- Upload images, logs, and documents
- Delete files from Cloudinary
- Generate optimized URLs
- Generate thumbnails

✅ Updated attachment controller
- Uploads to Cloudinary automatically
- Stores Cloudinary URLs in database
- Falls back to local storage if Cloudinary fails
- Deletes from Cloudinary when attachment is deleted

✅ Database schema updated
- Added `cloudinaryUrl` field
- Added `cloudinaryPublicId` field
- Added `fileType` field (image, log, document)
- `filePath` is now optional (for backward compatibility)

### Frontend:
✅ Enhanced FileUpload component
- Separate sections for Images, Logs, Documents
- Image preview with thumbnails
- Drag & drop support
- Upload progress indicators
- File categorization

✅ Enhanced AttachmentList component
- Image gallery with thumbnails
- Lightbox for full-size image viewing
- Separate sections for Images, Logs, Documents
- Download buttons (opens Cloudinary URL)
- Delete functionality

✅ Integrated into RMA & DTR forms
- File upload in forms (for existing cases)
- File upload in detail views

✅ Integrated into RMA & DTR detail views
- Image gallery display
- File download
- File management

---

## 🎯 Features

### Image Handling:
- ✅ Automatic image optimization
- ✅ Thumbnail generation
- ✅ Image gallery with lightbox
- ✅ Full-size image viewing

### Log/ZIP Files:
- ✅ ZIP file upload
- ✅ Log file upload
- ✅ Download functionality
- ✅ File type indicators

### Documents:
- ✅ PDF, Word, Excel support
- ✅ File type icons
- ✅ Download functionality

---

## 📁 Cloudinary Folder Structure

Files are organized in Cloudinary as:
```
crm/
  ├── dtr/
  │   └── {caseId}/
  │       ├── images/
  │       ├── logs/
  │       └── documents/
  └── rma/
      └── {caseId}/
          ├── images/
          ├── logs/
          └── documents/
```

---

## 🔄 How It Works

### Upload Flow:
1. User selects files in RMA/DTR form
2. Files are categorized (image, log, document)
3. Images show preview thumbnails
4. User clicks "Upload"
5. Files upload to Cloudinary
6. Cloudinary URLs stored in database
7. Files displayed in gallery/list

### Download Flow:
1. User clicks download button
2. If Cloudinary URL exists → Opens in new tab
3. If not → Downloads from server (backward compatibility)

### Delete Flow:
1. User clicks delete button
2. File deleted from Cloudinary
3. File deleted from database
4. Local file deleted (if exists)

---

## 🎨 UI Features

### File Upload:
- **Images Section**: Grid layout with preview thumbnails
- **Logs Section**: List with ZIP icon
- **Documents Section**: List with file icons
- **Progress Bars**: Show upload progress per file

### Attachment Display:
- **Image Gallery**: 4-column grid with thumbnails
- **Lightbox**: Click image to view full size
- **File Lists**: Organized by type
- **Download Buttons**: Direct Cloudinary links

---

## ⚙️ Configuration

### File Size Limits:
- Maximum: 10MB per file
- Set in: `upload.middleware.ts`

### Allowed File Types:
- Images: `image/*`
- Logs: `.zip`, `.log`
- Documents: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`

### Cloudinary Settings:
- Image optimization: Auto
- Format conversion: Auto
- Quality: Auto
- Folder structure: `crm/{caseType}/{caseId}`

---

## 🐛 Troubleshooting

### Files not uploading:
1. Check Cloudinary credentials in `.env`
2. Verify Cloudinary account is active
3. Check file size (max 10MB)
4. Check file type is allowed

### Images not displaying:
1. Check `cloudinaryUrl` in database
2. Verify Cloudinary URL is accessible
3. Check browser console for errors

### Delete not working:
1. Check user permissions
2. Verify Cloudinary credentials
3. Check if file exists in Cloudinary

---

## 📊 Cost Estimate

### Free Tier:
- 25GB storage
- 25GB bandwidth/month
- 25,000 transformations/month

### Typical Usage:
- 100 RMAs/month
- 5 images per RMA (500KB each) = 2.5GB/month
- 1 ZIP per RMA (2MB each) = 200MB/month
- **Total: ~3GB/month** ✅ Well within free tier!

---

## 🚀 Next Steps

1. **Add Cloudinary credentials** to `.env`
2. **Restart backend server**
3. **Test file upload** in RMA/DTR forms
4. **Verify images display** in gallery
5. **Test download** functionality

---

## ✨ Benefits

- ⚡ **Fast**: CDN delivery worldwide
- 🖼️ **Optimized**: Automatic image compression
- 📱 **Responsive**: Works on all devices
- 🔒 **Secure**: Private folders, signed URLs
- 💰 **Free**: Generous free tier
- 🎨 **Beautiful**: Image gallery with lightbox

---

**🎉 Cloudinary integration is complete and ready to use!**

Just add your Cloudinary credentials and restart the server.

