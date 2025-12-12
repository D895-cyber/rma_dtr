# Neon Database Setup for Vercel

## Your Connection String

Your Neon connection string:
```
postgresql://neondb_owner:npg_1BiS2LhHbmRc@ep-plain-paper-ad5057mo-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

✅ **This is a pooler connection string** - perfect for serverless/Vercel!

## Setting Up in Vercel

### Step 1: Add Environment Variable in Vercel

1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:

   **Name:** `DATABASE_URL`
   
   **Value:** 
   ```
   postgresql://neondb_owner:npg_1BiS2LhHbmRc@ep-plain-paper-ad5057mo-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

   **Important:** Copy the ENTIRE connection string including all parameters

5. Select environments: **Production**, **Preview**, and **Development** (or at least Production)

6. Click **Save**

### Step 2: Verify Connection String Format

Your connection string should be:
- ✅ Using the **pooler** endpoint (has `-pooler` in the hostname) - **GOOD!**
- ✅ Includes `sslmode=require` - Required for Neon
- ✅ Includes `channel_binding=require` - Security setting

**Note:** The "Development only" label in Neon just means this is a development database instance. The connection string itself will work from Vercel's production environment as long as:
- The database allows external connections (Neon does by default)
- The connection string is correctly set in Vercel

### Step 3: Run Database Migrations

After setting the environment variable, you need to run migrations:

**Option A: Run locally with production DATABASE_URL**

```bash
# Set the environment variable locally
export DATABASE_URL="postgresql://neondb_owner:npg_1BiS2LhHbmRc@ep-plain-paper-ad5057mo-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Navigate to backend
cd backend

# Run migrations
npx prisma migrate deploy
```

**Option B: Use Prisma Studio (Easier)**

1. Set the DATABASE_URL environment variable locally
2. Run: `npx prisma studio`
3. This will open a browser where you can see if tables exist
4. If tables don't exist, run migrations first

### Step 4: Redeploy on Vercel

After setting environment variables:

1. Go to Vercel Dashboard → Deployments
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger auto-deploy

## Verification

### Test Database Connection

1. **Check Health Endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return: `{"status":"OK",...}`

2. **Test Login:**
   - If you haven't created a user yet, register first via the API
   - Then try logging in through your frontend

### Common Issues

#### Issue: Still getting 500 errors

**Check:**
- Environment variable is set in Vercel (Settings → Environment Variables)
- Environment variable is set for **Production** environment
- Connection string includes ALL parameters (especially `sslmode=require`)
- You've redeployed after setting the environment variable

#### Issue: "relation does not exist" errors

**Fix:**
- Run database migrations: `npx prisma migrate deploy`
- Verify migrations ran successfully

#### Issue: Connection timeout

**Fix:**
- Verify the connection string is correct
- Check Neon dashboard to ensure database is active
- Try the direct connection string (non-pooler) as a test:
  - In Neon dashboard, look for "Connection string" (not pooler)
  - Test with that first, then switch back to pooler

## For Production Use

While your current connection string works, for a production application you might want to:

1. **Create a Production Database in Neon**
   - Create a separate Neon project for production
   - Use that connection string for production
   - Keep development database for local development

2. **Use Different Connection Strings**
   - Development: Your current connection string (local .env)
   - Production: Production database connection string (Vercel env vars)

## Connection String Parameters Explained

- `sslmode=require` - Requires SSL connection (Neon requirement)
- `channel_binding=require` - Security feature for SSL
- Pooler endpoint (`-pooler`) - Optimized for serverless/serverless functions

Your connection string is properly configured for Vercel! 🎉

