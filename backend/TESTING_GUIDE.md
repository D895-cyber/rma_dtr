# 🧪 Complete Testing Guide - Neon + Prisma + Postman

## 📋 **What You'll Do:**
1. ✅ Setup Neon database (1 minute)
2. ✅ Connect Prisma to Neon (2 minutes)
3. ✅ Start backend server (1 minute)
4. ✅ Test with Postman (5 minutes)

**Total Time: ~10 minutes** ⏱️

---

## 🟢 **Part 1: Setup Neon Database**

### **Step 1: Create Neon Account**

1. Open browser: **https://neon.tech**
2. Click **"Sign Up"**
3. Sign in with **GitHub** (fastest!)
4. Click **"Create a project"**

### **Step 2: Configure Project**

- **Project name:** `CRM Database` (or any name you like)
- **PostgreSQL version:** Keep default (16)
- **Region:** Choose closest to your location
- Click **"Create Project"**

### **Step 3: Copy Connection String**

After project creation, you'll see a connection string like:
```
postgresql://username:AbCd1234@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**📋 COPY THIS ENTIRE STRING!** You'll need it next.

---

## 🔧 **Part 2: Configure Backend**

### **Step 1: Create .env File**

Open terminal in backend folder:

```bash
cd backend

# Create .env from template
cp .env.example .env

# Open .env file
code .env  # or: nano .env
```

### **Step 2: Edit .env File**

Paste your Neon connection string:

```env
DATABASE_URL="postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="my-super-secret-jwt-key-change-this-in-production-abc123xyz789"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**⚠️ Important:**
- Replace the DATABASE_URL with YOUR Neon connection string
- Change JWT_SECRET to a random string (min 32 characters)

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Step 3: Generate Prisma Client**

```bash
npm run prisma:generate
```

**Expected output:**
```
✔ Generated Prisma Client (X.XX.X) to ./node_modules/@prisma/client
```

### **Step 4: Create Database Tables**

```bash
npm run prisma:migrate
```

**When prompted:**
- Migration name: `init`

**Expected output:**
```
Applying migration `20240108120000_init`
✔ Applied migration successfully

The following migration(s) have been created:
  migrations/
    └─ 20240108120000_init/
       └─ migration.sql

✔ Generated Prisma Client
```

### **Step 5: Verify Tables Created**

```bash
npm run prisma:studio
```

This opens **http://localhost:5555** in your browser.

**You should see 8 tables:**
- ✅ users
- ✅ sites
- ✅ audis
- ✅ projectors
- ✅ dtr_cases
- ✅ rma_cases
- ✅ audit_logs
- ✅ notifications

**Close Prisma Studio** (Ctrl+C in terminal) before continuing.

---

## 🚀 **Part 3: Start Backend Server**

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

### **Quick Test in Browser**

Open: **http://localhost:5000/health**

**Should see:**
```json
{
  "status": "OK",
  "message": "CRM API is running",
  "timestamp": "2024-01-08T12:00:00.000Z"
}
```

✅ **SUCCESS! Backend is running and connected to Neon!**

---

## 📬 **Part 4: Test with Postman**

### **Step 1: Install Postman (if needed)**

Download from: **https://www.postman.com/downloads/**

Or use Postman Web (no installation): **https://web.postman.com**

### **Step 2: Import Collection**

1. Open Postman
2. Click **"Import"** button (top left)
3. Click **"Upload Files"**
4. Select: `backend/CRM_API_Postman_Collection.json`
5. Click **"Import"**

You'll see a new collection: **"CRM API - Complete Collection"**

### **Step 3: Configure Environment**

The collection already has these variables:
- `baseUrl`: http://localhost:5000/api
- `token`: (will be set automatically after login)

**No configuration needed!** ✅

### **Step 4: Test Endpoints Step-by-Step**

#### **Test 1: Health Check**

1. Open folder: **"❤️ Health Check"**
2. Click: **"Health Check"**
3. Click: **"Send"**

**Expected Response (200 OK):**
```json
{
  "status": "OK",
  "message": "CRM API is running",
  "timestamp": "2024-01-08T12:00:00.000Z"
}
```

✅ Backend is alive!

---

#### **Test 2: Register First User**

1. Open folder: **"🔐 Authentication"**
2. Click: **"Register User"**
3. Click: **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "Admin User",
      "email": "admin@company.com",
      "role": "admin",
      "active": true,
      "createdAt": "2024-01-08T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

✅ User created!

---

#### **Test 3: Login**

1. Click: **"Login"**
2. Click: **"Send"**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**✅ Token is automatically saved!** (Check the "token" variable in collection)

---

#### **Test 4: Get Current User**

1. Click: **"Get Current User"**
2. Click: **"Send"**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid-here",
    "name": "Admin User",
    "email": "admin@company.com",
    "role": "admin",
    "active": true
  }
}
```

✅ Authentication working!

---

#### **Test 5: Create Site**

1. Open folder: **"🏢 Master Data - Sites"**
2. Click: **"Create Site"**
3. Click: **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Site created successfully",
  "data": {
    "site": {
      "id": "uuid-here",
      "siteName": "ABC Conference Center",
      "createdAt": "2024-01-08T12:00:00.000Z"
    }
  }
}
```

**📋 COPY THE SITE ID!** You'll need it for next steps.

---

#### **Test 6: Create Projector**

1. Open folder: **"📽️ Master Data - Projectors"**
2. Click: **"Create Projector"**
3. Click: **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Projector created successfully",
  "data": {
    "projector": {
      "id": "uuid-here",
      "modelNo": "Epson EB-L1500U",
      "serialNumber": "SN123456789",
      "createdAt": "2024-01-08T12:00:00.000Z"
    }
  }
}
```

**📋 COPY THE PROJECTOR ID!**

---

#### **Test 7: Create Audi**

1. Open folder: **"🎧 Master Data - Audis"**
2. Click: **"Create Audi"**
3. Edit the body - **replace** `SITE_ID_HERE` and `PROJECTOR_ID_HERE` with your IDs:

```json
{
  "audiNo": "Audi 1",
  "siteId": "YOUR_SITE_ID",
  "projectorId": "YOUR_PROJECTOR_ID"
}
```

4. Click: **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Audi created successfully",
  "data": {
    "audi": {
      "id": "uuid-here",
      "audiNo": "Audi 1",
      "siteId": "...",
      "projectorId": "...",
      "site": { ... },
      "projector": { ... }
    }
  }
}
```

**📋 COPY THE AUDI ID!**

---

#### **Test 8: Create DTR Case**

1. Open folder: **"📋 DTR Cases"**
2. Click: **"Create DTR Case"**
3. Edit body - **replace** `SITE_ID_HERE` and `AUDI_ID_HERE` with your IDs
4. Click: **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "DTR case created successfully",
  "data": {
    "case": {
      "id": "uuid-here",
      "caseNumber": "241205",
      "errorDate": "2024-01-15T00:00:00.000Z",
      "site": { ... },
      "audi": { ... },
      "unitModel": "Epson EB-L1500U",
      "callStatus": "open",
      "caseSeverity": "high"
    }
  }
}
```

✅ DTR Case created!

---

#### **Test 9: Get All DTR Cases**

1. Click: **"Get All DTR Cases"**
2. Click: **"Send"**

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "cases": [ ... ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

✅ Can retrieve cases!

---

#### **Test 10: Dashboard Statistics**

1. Open folder: **"📊 Analytics"**
2. Click: **"Dashboard Statistics"**
3. Click: **"Send"**

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "dtr": {
      "total": 1,
      "open": 1,
      "inProgress": 0,
      "closed": 0,
      "critical": 0,
      "myAssigned": 0,
      "recent": 1
    },
    "rma": { ... },
    "severity": { ... }
  }
}
```

✅ Analytics working!

---

## 🎉 **SUCCESS! All Tests Passed!**

### **What You've Tested:**
- ✅ Health check
- ✅ User registration
- ✅ User login
- ✅ JWT authentication
- ✅ Site creation
- ✅ Projector creation
- ✅ Audi creation (with relationships)
- ✅ DTR case creation
- ✅ Data retrieval
- ✅ Analytics dashboard

---

## 🔍 **Verify Data in Neon Dashboard**

1. Go to **https://console.neon.tech**
2. Select your project
3. Click **"SQL Editor"**
4. Run these queries:

```sql
-- Check all users
SELECT * FROM users;

-- Check all sites
SELECT * FROM sites;

-- Check all DTR cases with relationships
SELECT 
  dc.case_number,
  s.site_name,
  a.audi_no,
  p.model_no,
  dc.call_status
FROM dtr_cases dc
JOIN sites s ON dc.site_id = s.id
JOIN audis a ON dc.audi_id = a.id
JOIN projectors p ON a.projector_id = p.id;
```

✅ You should see your data!

---

## 📊 **Verify in Prisma Studio**

```bash
npm run prisma:studio
```

Opens **http://localhost:5555**

Browse all tables visually! 🎨

---

## 🎯 **Next Steps**

Now that backend is tested and working:

1. **Import Excel Data** - Get your existing data in
2. **Connect Frontend** - Replace localStorage with API calls
3. **Deploy** - Put it in production

---

## 🐛 **Troubleshooting**

### **Error: "Cannot connect to database"**
- Check .env file has correct DATABASE_URL
- Verify Neon project is active (check dashboard)
- Ensure ?sslmode=require is at end of connection string

### **Error: "Invalid token"**
- Login again in Postman
- Token expires after 7 days
- Check JWT_SECRET in .env is set

### **Error: "Foreign key constraint failed"**
- Make sure you created Site and Projector first
- Use correct IDs when creating Audi
- Copy-paste IDs carefully (they're long UUIDs)

### **401 Unauthorized**
- You forgot to login
- Click "Login" request first
- Token is automatically saved for other requests

---

## 📚 **Additional Resources**

- **API Documentation:** Check `API.md`
- **All Endpoints:** Listed in Postman collection
- **Database Schema:** Check `prisma/schema.prisma`
- **Setup Help:** Check `SETUP.md`

---

**🎊 Congratulations! Your backend is fully tested and ready!** 🚀




