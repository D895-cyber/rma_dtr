# 🚀 Production Deployment - File Upload Fix

## ✅ Issue Fixed

The "Route not found" error in production was caused by **missing attachment routes** in the Vercel serverless function.

## 🔧 What Was Fixed

1. **Added attachment routes** to `api/index.ts`
2. **Added other missing routes** (templates, searches, rules, notification preferences)
3. **Increased body parser limit** to 50MB for file uploads
4. **Increased Vercel function resources:**
   - Timeout: 30s → 60s
   - Memory: 1024MB → 3008MB
5. **Improved error handling** in attachment service

## 📋 Next Steps for Production

### 1. Rebuild Backend

```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in `backend/dist/` which the Vercel function uses.

### 2. Redeploy to Vercel

The changes are already pushed to git. Vercel should auto-deploy, or:

```bash
vercel --prod
```

### 3. Verify Environment Variables

Make sure these are set in **Vercel Environment Variables**:

**Backend (if separate deployment):**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

**Frontend:**
- `VITE_API_URL` (if backend is separate, e.g., `https://your-backend.vercel.app/api`)

### 4. Test Upload

After redeployment:
1. Open your production site
2. Try uploading an image
3. Check browser console for any errors
4. Verify file appears in Cloudinary dashboard

## 🔍 Troubleshooting

### Still getting "Route not found"?

1. **Check backend is built:**
   ```bash
   cd backend
   npm run build
   ```
   Verify `backend/dist/routes/attachment.routes.js` exists

2. **Check Vercel function logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check `api/index.ts` logs for errors

3. **Verify route is registered:**
   - Check `api/index.ts` includes: `app.use('/api/attachments', attachmentRoutes);`

4. **Test the endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/attachments
   # Should return 401 (unauthorized) not 404 (not found)
   ```

### Upload fails with timeout?

- Vercel function timeout is now 60s (increased from 30s)
- Memory is 3008MB (increased from 1024MB)
- If still timing out, check file size (should be < 10MB)

### CORS errors?

- Check `FRONTEND_URL` is set correctly in backend environment
- Verify CORS allows your frontend domain

---

**After redeployment, file uploads should work in production!** 🎉

