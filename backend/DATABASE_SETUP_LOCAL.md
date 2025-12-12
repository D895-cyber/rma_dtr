# Local PostgreSQL Setup (macOS)

## Step 1: Install PostgreSQL

```bash
# Install via Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify it's running
brew services list | grep postgresql
```

## Step 2: Create Database

```bash
# Create database
createdb crm_db

# Test connection
psql crm_db
# You should see: crm_db=#
# Type \q to exit
```

## Step 3: Configure Backend

```bash
# Create .env file
cp .env.example .env

# Open .env
nano .env  # or: code .env
```

**Edit .env file:**
```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/crm_db?schema=public"
```

**Replace YOUR_USERNAME with:**
- Your macOS username (run: `whoami` to find it)
- Or just use: `postgres`

**Example:**
```env
DATABASE_URL="postgresql://dev@localhost:5432/crm_db?schema=public"
```

## Step 4: Generate Prisma & Create Tables

```bash
# Generate Prisma Client
npm run prisma:generate

# Create tables
npm run prisma:migrate
# Name: init
```

## Step 5: Start Backend

```bash
npm run dev
```

✅ Backend running on http://localhost:5000
