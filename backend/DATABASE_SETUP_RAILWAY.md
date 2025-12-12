# Railway Database Setup (2 Minutes)

## Step 1: Create Database on Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub (or email)
4. Click "Provision PostgreSQL"
5. Wait 10 seconds for database to be created

## Step 2: Get Connection String

1. Click on the PostgreSQL service
2. Go to "Connect" tab
3. Look for "Postgres Connection URL"
4. Copy the entire string that looks like:
   postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:5432/railway

## Step 3: Configure Backend

```bash
# Create .env file
cp .env.example .env

# Open .env
nano .env  # or: code .env

# Paste your Railway connection string:
DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:5432/railway"
```

## Step 4: Generate Prisma Client & Create Tables

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# When prompted for migration name, type: init
```

## Step 5: Start Backend

```bash
npm run dev
```

✅ Backend should now be running on http://localhost:5000

Test: Open http://localhost:5000/health in browser!
