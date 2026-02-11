# 🔧 Vercel Deployment Troubleshooting

## Issue: PWA manifest.webmanifest returns 401 (Install not working)

**Symptoms:** Console shows `Failed to load resource: manifest.webmanifest server responded with status 401` and the PWA install button never appears or install fails.

**Cause:** Vercel **Deployment Protection** (Password Protection or Vercel Authentication) applies to all requests. The browser requests `/manifest.webmanifest` and `/sw.js` without cookies, so they get 401 and PWA install cannot work.

**Fix:**

1. Open **Vercel Dashboard** → your project → **Settings** → **Deployment Protection**.
2. Either:
   - **Disable** protection for **Production** (so the live site and PWA assets are public), or
   - Set protection to **“Only Preview Deployments”** so production is public and only preview URLs are protected.
3. Redeploy if needed. After that, `/manifest.webmanifest` and `/sw.js` should return 200 and the install prompt can appear.

If you must keep production protected, PWA install from that domain will not work unless you use a different hosting for static assets or an Enterprise/Advanced exception.

---

## Console: “[DEPRECATED] Default export is deprecated” (zustand)

This warning comes from a **dependency** (e.g. a library that uses `zustand`), not from your app code. It does not break the app. You can ignore it or wait for the upstream package to switch to `import { create } from 'zustand'`. No change required in this project.

---

## Issue: Vercel Not Taking Updates

If Vercel is not automatically deploying after a git push, try these solutions:

### 1. Check Git Integration

**Verify Vercel is connected to your GitHub repository:**
1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Verify the repository is connected
3. Check if webhooks are enabled

### 2. Manual Deployment Trigger

**Option A: Via Vercel Dashboard**
1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click **"Redeploy"** on the latest deployment
4. Or click **"Create Deployment"** → Select branch → Deploy

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel --prod
```

### 3. Force Push to Trigger Webhook

Sometimes the webhook doesn't fire. Try:
```bash
# Make a small change to trigger deployment
echo "# Force redeploy $(date)" >> README.md
git add README.md
git commit -m "chore: Force Vercel redeploy"
git push
```

### 4. Check Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check **"Build Logs"** for errors
4. Common issues:
   - Missing environment variables
   - Build timeout
   - TypeScript compilation errors
   - Missing dependencies

### 5. Verify Build Command

Check that `vercel.json` has the correct build command:
```json
{
  "buildCommand": "npm run vercel-build"
}
```

And `package.json` has:
```json
{
  "scripts": {
    "vercel-build": "cd backend && npm install && npm run prisma:generate && npm run build && cd .. && npm run build"
  }
}
```

### 6. Check Environment Variables

Ensure all required environment variables are set in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Required variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `FRONTEND_URL` (optional)
   - `NODE_ENV=production`

### 7. Clear Vercel Cache

Sometimes cached builds cause issues:
1. Go to Vercel Dashboard → Your Project → Settings → General
2. Scroll to **"Clear Build Cache"**
3. Click **"Clear"**
4. Trigger a new deployment

### 8. Check Branch Settings

Verify the correct branch is set for production:
1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Check **"Production Branch"** (should be `main` or `master`)
3. Ensure you're pushing to the correct branch

### 9. Verify Routes Are Built

After deployment, check that routes exist:
```bash
# In Vercel function logs, you should see:
# - backend/dist/routes/attachment.routes.js exists
# - All routes are imported correctly
```

### 10. Test Build Locally

Test the build command locally to catch errors:
```bash
npm run vercel-build
```

If this fails locally, it will fail on Vercel too.

---

## Quick Fix Checklist

- [ ] Verified git repository is connected in Vercel
- [ ] Checked build logs for errors
- [ ] Verified all environment variables are set
- [ ] Tested `npm run vercel-build` locally
- [ ] Cleared Vercel build cache
- [ ] Manually triggered redeploy
- [ ] Checked correct branch is set for production
- [ ] Verified routes are in the codebase

---

## Still Not Working?

If none of the above works:

1. **Check Vercel Status**: https://www.vercel-status.com/
2. **Review Vercel Documentation**: https://vercel.com/docs
3. **Contact Vercel Support**: Via dashboard → Help & Support

---

**Most Common Solution**: Manually trigger a redeploy from the Vercel dashboard!

