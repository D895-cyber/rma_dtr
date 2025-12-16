# 🚀 Vercel Deployment Guide

This guide will help you deploy your Full-Stack CRM Application to Vercel.

## 📋 Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A PostgreSQL database (Railway, Neon, Supabase, or any PostgreSQL provider)
3. Git repository (GitHub, GitLab, or Bitbucket)

## 🔧 Step 1: Database Setup

### Option A: Railway (Recommended - Free Tier)

1. Go to https://railway.app and sign up
2. Create a new project → "Provision PostgreSQL"
3. Click on PostgreSQL → "Connect" tab
4. Copy the **Postgres Connection URL**

### Option B: Neon (Free Tier)

1. Go to https://neon.tech and sign up
2. Create a new project
3. Go to Connection Details
4. Copy the **Connection String**

### Option C: Supabase (Free Tier)

1. Go to https://supabase.com and sign up
2. Create a new project
3. Go to Settings → Database
4. Copy the **Connection String (URI)**

## 🔐 Step 2: Generate JWT Secret

Generate a secure random string for JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value - you'll need it for Vercel environment variables.

## 📦 Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install && cd backend && npm install`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## 🌍 Step 4: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `a1b2c3d4e5f6...` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Your Vercel app URL | `https://your-app.vercel.app` |
| `VITE_API_URL` | API endpoint (for frontend) | `https://your-app.vercel.app/api` |

### Environment Variable Setup

Add these for all environments (Production, Preview, Development):

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-generated-secret-key-32-characters-minimum
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
VITE_API_URL=https://your-app.vercel.app/api
```

**Important**: After adding environment variables, you need to **redeploy** your application for changes to take effect.

## 🗄️ Step 5: Run Database Migrations

After deployment, you need to run Prisma migrations to create database tables:

### Option A: Run migrations locally

```bash
cd backend
npx prisma migrate deploy
```

Make sure your local `.env` has the production `DATABASE_URL`.

### Option B: Use Prisma Studio (local)

1. Set your production `DATABASE_URL` in local `.env`
2. Run: `cd backend && npx prisma studio`
3. Verify tables are created

### Option C: Use Vercel CLI

```bash
# SSH into Vercel function (if supported)
vercel dev

# Or run migrations via a one-off script
```

## ✅ Step 6: Verify Deployment

1. Visit your Vercel deployment URL
2. Check health endpoint: `https://your-app.vercel.app/api/health`
3. Test API: `https://your-app.vercel.app/api/auth/register` (POST request)

## 🔍 Troubleshooting

### Issue: "Module not found" errors

**Solution**: Ensure `backend/node_modules` is installed during build. The `installCommand` in `vercel.json` handles this.

### Issue: Database connection errors

**Solution**: 
- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Check that your database allows connections from Vercel's IPs
- Ensure SSL is enabled if required by your database provider

### Issue: Prisma Client not generated

**Solution**: The build script runs `prisma generate` automatically. If issues persist:
- Check build logs in Vercel dashboard
- Ensure `@prisma/client` is in `backend/package.json` dependencies

### Issue: CORS errors

**Solution**: 
- Verify `FRONTEND_URL` matches your actual Vercel domain
- For multiple origins, use comma-separated values: `https://app1.vercel.app,https://app2.vercel.app`

### Issue: Function timeout

**Solution**: 
- Vercel Pro plan increases timeout limits
- Optimize database queries
- Check function logs in Vercel dashboard

## 📝 Post-Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database migrations completed
- [ ] Health endpoint returns 200 OK
- [ ] Create first admin user via API
- [ ] Frontend can connect to API
- [ ] Authentication flow works
- [ ] All API endpoints tested

## 🔄 Updating Deployment

After making changes:

```bash
# Push to your Git repository
git push

# Vercel automatically deploys on push
# Or manually deploy:
vercel --prod
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check Prisma migration status


