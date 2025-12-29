# ✅ Pre-Deployment Checklist

Use this checklist before deploying to Vercel to ensure everything is configured correctly.

## 📋 Pre-Deployment

- [ ] **Database Setup**
  - [ ] PostgreSQL database created (Railway, Neon, or Supabase)
  - [ ] Database connection string copied
  - [ ] Database allows external connections

- [ ] **Environment Variables Prepared**
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `JWT_SECRET` - Generated secure random string (min 32 chars)
  - [ ] `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
  - [ ] `NODE_ENV` - Set to "production"
  - [ ] `FRONTEND_URL` - Your Vercel app URL
  - [ ] `VITE_API_URL` - API endpoint URL

- [ ] **Code Quality**
  - [ ] All tests passing (if applicable)
  - [ ] No console errors in browser
  - [ ] No TypeScript errors
  - [ ] Code committed to Git repository

## 🚀 Deployment Steps

1. [ ] **Connect Repository to Vercel**
   - [ ] Import Git repository in Vercel dashboard
   - [ ] Configure project settings (see VERCEL_DEPLOYMENT.md)

2. [ ] **Set Environment Variables in Vercel**
   - [ ] Go to Project Settings → Environment Variables
   - [ ] Add all required variables (Production, Preview, Development)
   - [ ] Verify all variables are set correctly

3. [ ] **Deploy**
   - [ ] Push to main branch (auto-deploy)
   - [ ] Or manually deploy via Vercel CLI or dashboard
   - [ ] Wait for build to complete

4. [ ] **Run Database Migrations**
   - [ ] Set production DATABASE_URL in local .env
   - [ ] Run: `cd backend && npx prisma migrate deploy`
   - [ ] Verify migrations completed successfully

5. [ ] **Post-Deployment Verification**
   - [ ] Health check: `https://your-app.vercel.app/api/health`
   - [ ] Frontend loads correctly
   - [ ] API endpoints respond
   - [ ] Create first admin user
   - [ ] Login functionality works
   - [ ] All major features tested

## 🔍 Verification Tests

- [ ] **API Health Check**
  ```bash
  curl https://your-app.vercel.app/api/health
  ```
  Should return: `{"status":"OK","message":"CRM API is running",...}`

- [ ] **Frontend Loads**
  - [ ] Visit root URL
  - [ ] No console errors
  - [ ] UI renders correctly

- [ ] **Authentication**
  - [ ] Can register new user
  - [ ] Can login
  - [ ] Token is stored correctly
  - [ ] Protected routes work

- [ ] **Database Connection**
  - [ ] API queries work
  - [ ] Data persists
  - [ ] No connection pool errors

## 🐛 Common Issues & Solutions

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Ensure Prisma client is generated

### Database Connection Errors
- Verify DATABASE_URL is correct
- Check database allows external connections
- Ensure SSL is enabled if required

### CORS Errors
- Verify FRONTEND_URL matches actual domain
- Check CORS headers in vercel.json

### Function Timeout
- Optimize database queries
- Consider upgrading to Vercel Pro plan
- Check function logs for slow operations

## 📝 Post-Deployment

- [ ] Update documentation with production URL
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)
- [ ] Set up CI/CD for auto-deployment (optional)
- [ ] Document any custom configurations

## 🔗 Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Detailed Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Environment Variables Guide](./VERCEL_DEPLOYMENT.md#step-4-configure-environment-variables)






