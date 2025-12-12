# 🔧 Troubleshooting Guide

## Login/API 500 Errors

### Issue: 500 Internal Server Error when trying to login

**Symptoms:**
- API returns 500 error
- Error message: "A server e..." (incomplete JSON response)
- Frontend shows "API Request Error: SyntaxError"

### Common Causes & Solutions

#### 1. Missing DATABASE_URL Environment Variable

**Check:**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Verify `DATABASE_URL` is set correctly

**Fix:**
```bash
# Your DATABASE_URL should look like:
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

#### 2. Database Connection String Format

**For Railway:**
- Use the "Postgres Connection URL" (not the proxy URL)
- Ensure it includes SSL parameters if required

**For Neon:**
- Use the connection string from the dashboard
- It should include `?sslmode=require` or similar

**For Supabase:**
- Use the "Connection String (URI)" from Settings → Database
- Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

#### 3. Prisma Client Not Generated

**Check build logs:**
- Look for errors about `@prisma/client` not found
- Verify `prisma generate` runs during build

**Fix:**
The build script should automatically run `prisma:generate`. If not:
1. Check `package.json` build script
2. Ensure `backend/package.json` has `prisma` in devDependencies

#### 4. Database Migrations Not Run

**Symptoms:**
- Tables don't exist
- Prisma errors about missing tables

**Fix:**
```bash
# Locally, set production DATABASE_URL and run:
cd backend
npx prisma migrate deploy
```

#### 5. Connection Pool Exhausted

**Symptoms:**
- Intermittent connection errors
- "Too many connections" errors

**Fix:**
- The Prisma singleton pattern handles this
- If issues persist, check database connection limits
- Consider using connection pooling (PgBouncer)

#### 6. Missing Environment Variables

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens (min 32 chars)
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `NODE_ENV` - Set to "production"
- `FRONTEND_URL` - Your Vercel app URL
- `VITE_API_URL` - API endpoint URL

### Debugging Steps

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Deployments → Select deployment → Functions
   - Check the `/api` function logs
   - Look for error messages

2. **Test Health Endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return: `{"status":"OK",...}`

3. **Test Database Connection:**
   - Use Prisma Studio locally with production DATABASE_URL
   - Or use a database client (pgAdmin, DBeaver, etc.)

4. **Check Build Logs:**
   - Vercel Dashboard → Deployments → Build Logs
   - Look for errors during `prisma generate`

5. **Verify Environment Variables:**
   ```bash
   # In Vercel function logs, temporarily add:
   console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
   ```

### Quick Fixes

1. **Redeploy:**
   - After adding/changing environment variables, redeploy
   - Vercel → Deployments → Redeploy

2. **Clear Build Cache:**
   - Vercel → Settings → General → Clear Build Cache

3. **Check Prisma Client Location:**
   - Ensure Prisma client is generated in `backend/node_modules/@prisma/client`
   - Should be generated during build

### Still Not Working?

1. Check Vercel function logs for specific error messages
2. Verify database is accessible from Vercel's IP ranges
3. Ensure database allows external connections
4. Check if database requires SSL connections

