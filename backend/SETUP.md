# 🚀 Backend Setup Guide

Complete step-by-step guide to set up your CRM backend.

## ✅ Step 1: Install PostgreSQL

Choose one option:

### Option A: Local PostgreSQL (Recommended for Development)

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb crm_db

# Verify installation
psql crm_db
# You should see: crm_db=#
# Type \q to exit
```

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install and remember your password
3. Open pgAdmin or psql and create database `crm_db`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb crm_db
```

### Option B: Railway (Free Cloud Database)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Provision PostgreSQL"
4. Click on PostgreSQL → "Connect" → Copy "Postgres Connection URL"
5. Use this URL in your `.env` file

### Option C: Supabase (Free Tier)

1. Go to https://supabase.com
2. Sign up and create new project
3. Go to Settings → Database → Connection String (URI)
4. Copy connection string
5. Use this in your `.env` file

---

## ✅ Step 2: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env file
nano .env
# or
code .env
```

**For Local PostgreSQL:**
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/crm_db?schema=public"
JWT_SECRET="change-this-to-a-long-random-string-min-32-characters"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Replace:**
- `your_username` - Your PostgreSQL username (default: `postgres` or your system username)
- `your_password` - Your PostgreSQL password (leave empty if no password)
- JWT_SECRET - Generate random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**For Railway/Supabase:**
```env
DATABASE_URL="postgresql://user:pass@host:port/database"
# (Use the connection string they provided)
JWT_SECRET="..."
# ... rest same as above
```

---

## ✅ Step 3: Generate Prisma Client & Create Database Tables

```bash
# Generate Prisma Client (creates TypeScript types)
npm run prisma:generate

# Run database migrations (creates tables)
npm run prisma:migrate

# When prompted for migration name, enter: init
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Database schema applied successfully
```

---

## ✅ Step 4: Verify Database Setup

```bash
# Open Prisma Studio (visual database browser)
npm run prisma:studio
```

This opens http://localhost:5555 in your browser where you can see all your database tables.

You should see these tables:
- users
- sites
- projectors
- audis
- dtr_cases
- rma_cases
- audit_logs
- notifications

---

## ✅ Step 5: Create First Admin User

You have two options:

### Option A: Using Prisma Studio

1. Run `npm run prisma:studio`
2. Click on "users" table
3. Click "Add record"
4. Fill in:
   - name: "Admin User"
   - email: "admin@company.com"
   - password_hash: (use tool below to generate)
   - role: "admin"
   - active: true
5. Save

**Generate password hash:**
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10).then(hash => console.log(hash))"
```

### Option B: Using API (after server starts)

```bash
# First start the server
npm run dev

# Then in another terminal:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@company.com",
    "password": "password123",
    "role": "admin"
  }'
```

---

## ✅ Step 6: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
🚀 CRM API Server is running!
📍 URL: http://localhost:5000
🌍 Environment: development
📊 Health check: http://localhost:5000/health

✅ Ready to accept requests!
```

---

## ✅ Step 7: Test the API

Open new terminal and test:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
{
  "status": "OK",
  "message": "CRM API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'

# Expected response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token!** You'll need it for authenticated requests.

---

## ✅ Step 8: Test Authenticated Endpoints

```bash
# Replace YOUR_TOKEN with the token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Create a site
curl -X POST http://localhost:5000/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteName": "ABC Conference Center"}'

# Get all sites
curl http://localhost:5000/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎉 Success! Your backend is running!

### Next Steps:

1. ✅ Backend is running on http://localhost:5000
2. ⏳ Create more users (engineers, staff, managers)
3. ⏳ Add sites, audis, and projectors
4. ⏳ Connect frontend to this backend
5. ⏳ Import Excel data

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL is not set"
- Check your `.env` file exists
- Verify `DATABASE_URL` is set correctly
- Restart the server

### Error: "Connection refused" to database
- Ensure PostgreSQL is running: `brew services list` (macOS)
- Check DATABASE_URL has correct host, port, username, password
- Try connecting with psql: `psql $DATABASE_URL`

### Error: "Port 5000 already in use"
- Change PORT in `.env` to 5001 or another port
- Or kill the process using port 5000

### Error: "Module not found"
- Run `npm install` again
- Delete `node_modules` and run `npm install`

### Database schema out of sync
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Then re-run migrations
npm run prisma:migrate
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

---

## 🎯 Ready for Production?

When deploying to production:

1. Set `NODE_ENV=production` in .env
2. Use strong JWT_SECRET (32+ characters)
3. Use production database (not local)
4. Enable HTTPS
5. Set up proper logging
6. Configure backups
7. Set up monitoring

---

Need help? Check the README.md or create an issue!




