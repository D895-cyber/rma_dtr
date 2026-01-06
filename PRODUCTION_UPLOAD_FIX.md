# 🔧 Production Upload Error Fix

## Problem
Getting "Route not found" error when uploading images in production.

## Root Cause
The attachment service might not be detecting the correct API URL in production, or the backend route might not be accessible.

## Solutions

### Solution 1: Set VITE_API_URL Environment Variable (Recommended)

In your **Vercel project settings** (or your hosting platform):

1. Go to **Settings → Environment Variables**
2. Add:
   ```env
   VITE_API_URL=https://your-backend-domain.vercel.app/api
   ```
   Or if using serverless functions:
   ```env
   VITE_API_URL=https://your-app.vercel.app/api
   ```
3. **Redeploy** the frontend

### Solution 2: Verify Backend is Deployed

Make sure your backend is deployed and accessible:

1. **Check backend health endpoint:**
   ```bash
   curl https://your-backend-domain.vercel.app/health
   ```

2. **Check attachment route exists:**
   ```bash
   curl https://your-backend-domain.vercel.app/api/attachments
   # Should return 401 (unauthorized) not 404 (not found)
   ```

### Solution 3: Check Backend Route Registration

Verify the attachment route is registered in `backend/src/server.ts`:

```typescript
app.use('/api/attachments', attachmentRoutes);
```

### Solution 4: Check CORS Configuration

Make sure CORS allows file uploads from your frontend domain:

In `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

### Solution 5: Verify Environment Variables in Production

**Backend environment variables:**
- ✅ `CLOUDINARY_CLOUD_NAME`
- ✅ `CLOUDINARY_API_KEY`
- ✅ `CLOUDINARY_API_SECRET`
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET`
- ✅ `FRONTEND_URL` (should be your frontend domain)

**Frontend environment variables:**
- ✅ `VITE_API_URL` (should be your backend API URL)

## Debugging Steps

1. **Open browser console** (F12) in production
2. **Check the API URL** being used:
   ```javascript
   console.log('API Base:', window.location.origin);
   ```
3. **Check network tab** when uploading:
   - What URL is being called?
   - What's the response status?
   - What's the error message?

4. **Test the endpoint directly:**
   ```bash
   curl -X POST https://your-backend/api/attachments/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test.jpg" \
     -F "caseId=test-id" \
     -F "caseType=RMA"
   ```

## Quick Fix

If you're using Vercel with serverless functions:

1. **Set `VITE_API_URL`** in Vercel environment variables:
   ```
   VITE_API_URL=https://your-app.vercel.app/api
   ```

2. **Redeploy frontend**

3. **Test upload** - should work now!

## Common Issues

### Issue 1: Backend Not Deployed
- **Symptom**: 404 or connection refused
- **Fix**: Deploy backend first

### Issue 2: Wrong API URL
- **Symptom**: Route not found
- **Fix**: Set `VITE_API_URL` environment variable

### Issue 3: CORS Error
- **Symptom**: CORS policy error in console
- **Fix**: Update `FRONTEND_URL` in backend environment

### Issue 4: Authentication Error
- **Symptom**: 401 Unauthorized
- **Fix**: Check JWT token is being sent correctly

---

**After fixing, test the upload again!**

