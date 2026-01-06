# 🔧 Vercel Build Fix for File Uploads

## Issue
Getting 404 errors for `/api/attachments` routes in production.

## Root Cause
The Vercel serverless function needs the backend to be built before the routes can be imported.

## Solution

### Option 1: Update Vercel Build Command (Recommended)

In your **Vercel project settings**:

1. Go to **Settings → General → Build & Development Settings**
2. Update **Build Command** to:
   ```bash
   cd backend && npm run build && cd .. && npm run build
   ```
3. Or if you have a `vercel-build` script:
   ```bash
   npm run vercel-build
   ```

### Option 2: Add vercel-build Script

Add to `package.json`:
```json
{
  "scripts": {
    "vercel-build": "cd backend && npm run build && npm run build"
  }
}
```

### Option 3: Manual Build Before Deploy

Before deploying to Vercel:
```bash
cd backend
npm run build
cd ..
git add backend/dist
git commit -m "build: Add compiled backend for Vercel"
git push
```

## Verify Routes Are Built

Check that these files exist after build:
- `backend/dist/routes/attachment.routes.js`
- `backend/dist/controllers/attachment.controller.js`
- `backend/dist/middleware/upload.middleware.js`

## Current Status

✅ **Routes added** to `api/index.ts`
✅ **Multer configured** for serverless (memory storage)
✅ **Backend compiled** locally
⏳ **Need to ensure** Vercel builds backend during deployment

## Next Steps

1. **Update Vercel build command** (see above)
2. **Redeploy** to Vercel
3. **Test upload** - should work now!

---

**The routes are in the code, they just need to be built during Vercel deployment!**

