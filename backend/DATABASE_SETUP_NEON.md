# Neon Database Setup with Prisma (1 Minute)

## Step 1: Create Neon Account

1. Go to https://neon.tech
2. Click "Sign Up"
3. Sign in with GitHub (easiest and fastest)
4. Click "Create a project"

## Step 2: Configure Project

1. **Project name:** CRM Database (or any name)
2. **PostgreSQL version:** Keep default (16)
3. **Region:** Choose closest to you
4. Click "Create Project"

## Step 3: Get Connection String

After project is created, you'll see:
- A connection string that looks like:
  ```
  postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

**Copy this entire string!**

Or find it later:
1. Dashboard → Your Project
2. "Connection Details" section
3. Copy "Connection string"

## Step 4: Configure Backend

```bash
cd backend

# Create .env file
cp .env.example .env

# Open .env
nano .env  # or: code .env
```

**Paste your Neon connection string:**
```env
DATABASE_URL="postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-random-secret-key-min-32-characters"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

## Step 5: Generate Prisma Client & Create Tables

```bash
# Generate Prisma Client (creates TypeScript types)
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# When prompted for migration name, type: init
```

Expected output:
```
✔ Generated Prisma Client
Applying migration `20240101000000_init`
✔ Applied migration successfully
```

## Step 6: Verify Database (Optional)

```bash
# Open Prisma Studio - Visual Database Browser
npm run prisma:studio
```

Opens http://localhost:5555 in browser
You should see all your tables!

## Step 7: Start Backend

```bash
npm run dev
```

Expected output:
```
🚀 CRM API Server is running!
📍 URL: http://localhost:5000
✅ Ready to accept requests!
```

## Step 8: Test It Works

Open browser: http://localhost:5000/health

Should see:
```json
{
  "status": "OK",
  "message": "CRM API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

✅ SUCCESS! Your backend is now connected to Neon!

---

## 🎁 Bonus: Neon Dashboard Features

In your Neon dashboard you can:
- 📊 View database size and usage
- 🔍 Run SQL queries directly
- 📈 Monitor connection metrics
- 🌿 Create branches for testing
- 🔐 Manage access and security

---

## 🐛 Troubleshooting

**Error: "Can't reach database server"**
- Check your internet connection
- Verify connection string is correct
- Make sure you copied the full string including ?sslmode=require

**Error: "Environment variable not found: DATABASE_URL"**
- Make sure .env file exists in backend folder
- Restart your terminal/IDE after creating .env

**Error: "Migration failed"**
- Check DATABASE_URL in .env is correct
- Try: npm run prisma:migrate reset (⚠️ deletes all data)
- Then: npm run prisma:migrate
