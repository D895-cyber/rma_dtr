# 📋 Step-by-Step Guide: Create Your First DTR Case

## ⚠️ Important: Order Matters!

You got the foreign key error because you need to create master data **BEFORE** creating DTR cases.

**Correct Order:**
1. Register/Login → Get Token
2. Create Site
3. Create Projector  
4. Create Audi (links Site + Projector)
5. Create DTR Case (uses Site + Audi IDs)

---

## 🧪 Method 1: Using Postman (Recommended)

### Step 1: Import Collection
1. Open Postman
2. Click **Import** → Select `CRM_API_Postman_Collection.json`
3. Collection appears in left sidebar

### Step 2: Login
1. Go to **Auth** folder → **Login**
2. Should already have this in Body:
   ```json
   {
     "email": "admin@crm.com",
     "password": "Admin@123"
   }
   ```
3. Click **Send**
4. ✅ Token is automatically saved for all other requests!

### Step 3: Create Site
1. Go to **Master Data** folder → **Create Site**
2. Body example:
   ```json
   {
     "siteName": "PVR Phoenix Mall",
     "location": "Mumbai, Maharashtra",
     "siteCode": "PVR-PHX-001"
   }
   ```
3. Click **Send**
4. **Copy the `id` from response** → You'll need it!
   ```json
   {
     "data": {
       "site": {
         "id": "abc-123-xyz",  ← COPY THIS
         "siteName": "PVR Phoenix Mall"
       }
     }
   }
   ```

### Step 4: Create Projector
1. Go to **Master Data** → **Create Projector**
2. Body example:
   ```json
   {
     "modelNumber": "NEC-NC1200C",
     "manufacturer": "NEC",
     "specifications": "Digital Cinema Projector, 12000 Lumens"
   }
   ```
3. Click **Send**
4. **Copy the `id` from response**

### Step 5: Create Audi
1. Go to **Master Data** → **Create Audi**
2. Body example (paste your IDs):
   ```json
   {
     "audiNumber": "AUDI-1",
     "siteId": "paste-site-id-here",
     "projectorId": "paste-projector-id-here",
     "serialNumber": "SN-NEC-001",
     "status": "active"
   }
   ```
3. Click **Send**
4. **Copy the `id` from response**

### Step 6: Create DTR Case ✅
1. Go to **DTR Cases** → **Create DTR Case**
2. Body example (paste your IDs):
   ```json
   {
     "siteId": "paste-site-id-here",
     "audiId": "paste-audi-id-here",
     "complaintDetails": "Projector showing color distortion",
     "callStatus": "open",
     "caseSeverity": "high",
     "issueCategory": "hardware",
     "priority": "high"
   }
   ```
3. Click **Send**
4. ✅ **SUCCESS!** Your DTR case is created!

---

## 🖥️ Method 2: Using Terminal/cURL

### Get Token First
```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin@123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

### Create Site
```bash
curl -X POST http://localhost:5001/api/master-data/sites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "siteName": "INOX Bangalore",
    "location": "Bangalore, Karnataka",
    "siteCode": "INOX-BLR-001"
  }'
```
**→ Copy the `id` from response**

### Create Projector
```bash
curl -X POST http://localhost:5001/api/master-data/projectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "modelNumber": "BARCO-DP2K-20C",
    "manufacturer": "BARCO",
    "specifications": "2K Cinema Projector"
  }'
```
**→ Copy the `id` from response**

### Create Audi
```bash
# Replace SITE_ID and PROJECTOR_ID with your actual IDs
curl -X POST http://localhost:5001/api/master-data/audis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "audiNumber": "AUDI-02",
    "siteId": "SITE_ID_HERE",
    "projectorId": "PROJECTOR_ID_HERE",
    "serialNumber": "BARCO-SN-789",
    "status": "active"
  }'
```
**→ Copy the `id` from response**

### Create DTR Case
```bash
# Replace SITE_ID and AUDI_ID with your actual IDs
curl -X POST http://localhost:5001/api/dtr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "siteId": "SITE_ID_HERE",
    "audiId": "AUDI_ID_HERE",
    "complaintDetails": "Projector lamp failure",
    "callStatus": "open",
    "caseSeverity": "critical",
    "issueCategory": "hardware",
    "priority": "urgent"
  }'
```

---

## ✅ Verify Your Data

### Check All Sites
```bash
curl -X GET http://localhost:5001/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN"
```

### Check All Projectors
```bash
curl -X GET http://localhost:5001/api/master-data/projectors \
  -H "Authorization: Bearer $TOKEN"
```

### Check All Audis
```bash
curl -X GET http://localhost:5001/api/master-data/audis \
  -H "Authorization: Bearer $TOKEN"
```

### Check All DTR Cases
```bash
curl -X GET http://localhost:5001/api/dtr \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Quick Reference: Required Fields

### Site (Required)
- ✅ `siteName` - string
- ✅ `location` - string  
- ✅ `siteCode` - string (unique)

### Projector (Required)
- ✅ `modelNumber` - string
- ✅ `manufacturer` - string
- ⭕ `specifications` - string (optional)

### Audi (Required)
- ✅ `audiNumber` - string
- ✅ `siteId` - UUID (from Site)
- ✅ `projectorId` - UUID (from Projector)
- ✅ `serialNumber` - string
- ✅ `status` - "active" | "inactive" | "maintenance"

### DTR Case (Required)
- ✅ `siteId` - UUID (from Site)
- ✅ `audiId` - UUID (from Audi)
- ✅ `complaintDetails` - string
- ✅ `callStatus` - "open" | "in_progress" | "closed"
- ✅ `caseSeverity` - "low" | "medium" | "high" | "critical"
- ✅ `issueCategory` - "hardware" | "software" | "network" | "other"
- ✅ `priority` - "low" | "medium" | "high" | "urgent"

---

## 🐛 Common Errors & Fixes

### ❌ "Foreign key constraint violated"
**Cause:** Site/Audi doesn't exist  
**Fix:** Create Site and Audi first, then use their IDs

### ❌ "401 Unauthorized"
**Cause:** Token expired or missing  
**Fix:** Login again to get a new token

### ❌ "400 Bad Request - Missing required field"
**Cause:** Required field is missing  
**Fix:** Check the required fields list above

### ❌ "Unique constraint violation"
**Cause:** `siteCode` already exists  
**Fix:** Use a different `siteCode`

---

## 📊 Database Relationships

```
Site (1) ──┬──> (N) Audis
           └──> (N) DTR Cases
           
Projector (1) ──> (N) Audis

Audi (1) ──> (N) DTR Cases

User (1) ──> (N) DTR Cases (as creator/assignee)
```

**Translation:**
- One Site has many Audis
- One Site has many DTR Cases
- One Projector can be in many Audis
- One Audi has many DTR Cases

---

## ✅ Success Checklist

- [ ] Logged in successfully
- [ ] Created at least 1 Site
- [ ] Created at least 1 Projector
- [ ] Created at least 1 Audi (linked Site + Projector)
- [ ] Created DTR Case (using Site ID + Audi ID)
- [ ] Verified data with GET requests

**All checked?** 🎉 You're ready to use the CRM!

---

**Need help?** Check:
- `NEXT_STEPS.md` - Complete testing guide
- `TESTING_GUIDE.md` - Detailed testing instructions
- `API.md` - Full API documentation








