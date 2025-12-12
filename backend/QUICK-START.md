# ⚡ Quick Start (5 Minutes)

## 🎯 Prerequisites
- PostgreSQL installed and running
- Node.js 18+ installed

## 🚀 Quick Setup

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your database URL
# DATABASE_URL="postgresql://username:password@localhost:5432/crm_db"

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Create database tables
npm run prisma:migrate
# Enter migration name: init

# 5. Start server
npm run dev
```

## ✅ Verify It's Working

Open http://localhost:5000/health in your browser.

You should see:
```json
{
  "status": "OK",
  "message": "CRM API is running"
}
```

## 🎉 Success!

Your backend is now running on http://localhost:5000

### Create First User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@company.com",
    "password": "password123",
    "role": "admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'
```

Save the token from the response!

## 📚 Full Documentation

See SETUP.md for detailed step-by-step guide.

## 🆘 Need Help?

**Database connection failed?**
- Check PostgreSQL is running: `brew services list` (macOS)
- Verify DATABASE_URL in .env

**Port already in use?**
- Change PORT in .env to 5001

**Module not found?**
- Run `npm install` again



