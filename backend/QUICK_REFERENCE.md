# ⚡ Quick Reference Card

## 🚀 Setup (5 Minutes)

### 1. Get Neon Database
```
1. Go to: https://neon.tech
2. Sign up with GitHub
3. Create project
4. Copy connection string
```

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
nano .env  # Paste Neon connection string
```

### 3. Setup Database
```bash
npm run prisma:generate
npm run prisma:migrate  # name: init
```

### 4. Start Server
```bash
npm run dev
```

**Test:** http://localhost:5000/health

---

## 🧪 Test with Postman

### Import Collection
```
1. Open Postman
2. Import → Upload Files
3. Select: CRM_API_Postman_Collection.json
```

### Test Flow
```
1. Register User → Get token
2. Login → Token auto-saved
3. Create Site
4. Create Projector
5. Create Audi (use Site ID + Projector ID)
6. Create DTR Case (use Site ID + Audi ID)
7. Get Dashboard Stats
```

---

## 📝 Common Commands

```bash
# Start server
npm run dev

# View database (GUI)
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (⚠️ deletes data)
npm run prisma:migrate reset

# Generate Prisma Client
npm run prisma:generate
```

---

## 🔑 Environment Variables

```env
DATABASE_URL="postgresql://..."  # From Neon
JWT_SECRET="random-32-char-string"
PORT=5000
NODE_ENV="development"
```

---

## 📊 Key Endpoints

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/users
GET  /api/users/engineers

GET  /api/master-data/sites
POST /api/master-data/sites
GET  /api/master-data/audis
POST /api/master-data/audis
GET  /api/master-data/projectors
POST /api/master-data/projectors

GET  /api/dtr
POST /api/dtr
GET  /api/dtr/:id
POST /api/dtr/:id/assign
POST /api/dtr/:id/status
POST /api/dtr/:id/close

GET  /api/rma
POST /api/rma
POST /api/rma/:id/tracking

GET  /api/notifications
GET  /api/notifications/unread-count

GET  /api/analytics/dashboard
GET  /api/analytics/trends
```

---

## 🐛 Quick Fixes

**Can't connect to database**
→ Check DATABASE_URL in .env

**401 Unauthorized**
→ Login in Postman first

**Port 5000 in use**
→ Change PORT in .env to 5001

**Prisma errors**
→ npm run prisma:generate

---

## 📚 Documentation

- **Full Setup:** SETUP.md
- **Testing Guide:** TESTING_GUIDE.md
- **API Docs:** API.md
- **Neon Setup:** DATABASE_SETUP_NEON.md

---

## ✅ Checklist

- [ ] Neon account created
- [ ] .env file configured
- [ ] Prisma generated
- [ ] Migrations run
- [ ] Server starts successfully
- [ ] Health check passes
- [ ] Postman collection imported
- [ ] User registered & logged in
- [ ] Master data created
- [ ] DTR case created
- [ ] Analytics working

**All checked?** ✅ Backend is ready!
