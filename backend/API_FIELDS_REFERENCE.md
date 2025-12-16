# 📋 API Fields Reference - Quick Copy & Paste

## ✅ Correct Field Names for Each Endpoint

---

### 1️⃣ **Authentication**

#### Register User
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "role": "admin"
}
```
**Roles:** `admin`, `manager`, `engineer`, `staff`

#### Login
```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

---

### 2️⃣ **Sites**

#### Create Site
```json
{
  "siteName": "PVR Phoenix Mall",
  "location": "Mumbai, Maharashtra",
  "siteCode": "PVR-PHX-001"
}
```

**Required Fields:**
- ✅ `siteName` - string
- ✅ `location` - string
- ✅ `siteCode` - string (must be unique)

---

### 3️⃣ **Projectors**

#### Create Projector
```json
{
  "modelNo": "NEC-NC1200C",
  "serialNumber": "SN-NEC-12345"
}
```

**Required Fields:**
- ✅ `modelNo` - string (NOT `modelNumber`)
- ✅ `serialNumber` - string (must be unique)

**❌ Common Mistakes:**
- Don't use `modelNumber` → Use `modelNo`
- Don't add `manufacturer` → Field doesn't exist
- Don't add `specifications` → Field doesn't exist

---

### 4️⃣ **Audis**

#### Create Audi
```json
{
  "audiNo": "AUDI-01",
  "siteId": "site-uuid-here",
  "projectorId": "projector-uuid-here"
}
```

**Required Fields:**
- ✅ `audiNo` - string (NOT `audiNumber`)
- ✅ `siteId` - UUID from Sites table
- ✅ `projectorId` - UUID from Projectors table (optional, can be null)

**Note:** `siteId` and `projectorId` must reference existing records!

---

### 5️⃣ **DTR Cases**

#### Create DTR Case
```json
{
  "siteId": "site-uuid-here",
  "audiId": "audi-uuid-here",
  "complaintDetails": "Projector lamp failure - no display",
  "callStatus": "open",
  "caseSeverity": "critical",
  "issueCategory": "hardware",
  "priority": "urgent"
}
```

**Required Fields:**
- ✅ `siteId` - UUID from Sites table
- ✅ `audiId` - UUID from Audis table  
- ✅ `complaintDetails` - string
- ✅ `callStatus` - enum
- ✅ `caseSeverity` - enum
- ✅ `issueCategory` - enum
- ✅ `priority` - enum

**Optional Fields:**
- ⭕ `assignedTo` - UUID from Users table

**Enums:**
- `callStatus`: `"open"`, `"in_progress"`, `"closed"`
- `caseSeverity`: `"low"`, `"medium"`, `"high"`, `"critical"`
- `issueCategory`: `"hardware"`, `"software"`, `"network"`, `"other"`
- `priority`: `"low"`, `"medium"`, `"high"`, `"urgent"`

---

### 6️⃣ **RMA Cases**

#### Create RMA Case
```json
{
  "siteId": "site-uuid-here",
  "audiId": "audi-uuid-here",
  "rmaType": "RMA",
  "productName": "NEC Projector Lamp",
  "productPartNumber": "NP26LP",
  "serialNumber": "SN-LAMP-789",
  "defectDetails": "Lamp burnt out after 2000 hours",
  "status": "pending"
}
```

**Required Fields:**
- ✅ `siteId` - UUID
- ⭕ `audiId` - UUID (optional)
- ✅ `rmaType` - enum: `"RMA"`, `"CI RMA"`, `"Lamps"`
- ✅ `productName` - string
- ✅ `productPartNumber` - string
- ✅ `serialNumber` - string
- ✅ `defectDetails` - string
- ✅ `status` - enum

**Optional Fields:**
- ⭕ `assignedTo` - UUID
- ⭕ `replacementTracking` - string
- ⭕ `defectiveTracking` - string

**Status Enum:**
- `"pending"`, `"approved"`, `"in_transit"`, `"completed"`, `"rejected"`

---

## 🎯 Complete Flow Example

### Step-by-Step with Real Data

```bash
# 1. Login
POST /api/auth/login
{
  "email": "admin@crm.com",
  "password": "Admin@123"
}
# → Save the token

# 2. Create Site
POST /api/master-data/sites
{
  "siteName": "PVR Phoenix Mall",
  "location": "Mumbai",
  "siteCode": "PVR-PHX-001"
}
# → Copy the Site ID: abc-123-xyz

# 3. Create Projector
POST /api/master-data/projectors
{
  "modelNo": "NEC-NC1200C",
  "serialNumber": "SN-NEC-12345"
}
# → Copy the Projector ID: def-456-uvw

# 4. Create Audi
POST /api/master-data/audis
{
  "audiNo": "AUDI-01",
  "siteId": "abc-123-xyz",
  "projectorId": "def-456-uvw"
}
# → Copy the Audi ID: ghi-789-rst

# 5. Create DTR Case
POST /api/dtr
{
  "siteId": "abc-123-xyz",
  "audiId": "ghi-789-rst",
  "complaintDetails": "Projector showing color distortion",
  "callStatus": "open",
  "caseSeverity": "high",
  "issueCategory": "hardware",
  "priority": "high"
}
# → Success! ✅
```

---

## 🐛 Common Field Name Mistakes

| ❌ Wrong | ✅ Correct | Endpoint |
|----------|-----------|----------|
| `modelNumber` | `modelNo` | Projectors |
| `audiNumber` | `audiNo` | Audis |
| `unitModelNo` | Use `modelNo` from Projector | DTR |
| `unitSerialNo` | Use `serialNumber` from Projector | DTR |

---

## 📊 Field Mappings from Frontend to Backend

| Frontend (localStorage) | Backend API | Table |
|-------------------------|-------------|-------|
| Site Name | `siteName` | sites |
| Audi No | `audiNo` | audis |
| Unit Model # | `modelNo` | projectors |
| Unit Serial # | `serialNumber` | projectors/audis |
| Product Name (RMA) | `productName` | rma_cases |
| Part Number (RMA) | `productPartNumber` | rma_cases |

---

## ✅ Validation Rules

### Site
- `siteCode` must be unique
- All fields are required

### Projector
- `serialNumber` must be unique
- All fields are required

### Audi
- `siteId` must reference existing Site
- `projectorId` must reference existing Projector (or null)
- `audiNo` is just a string (not required to be unique)

### DTR Case
- `siteId` must reference existing Site
- `audiId` must reference existing Audi
- All enum values must match exactly (case-sensitive)

### RMA Case
- `siteId` must reference existing Site
- `audiId` is optional
- `rmaType` must be one of: `"RMA"`, `"CI RMA"`, `"Lamps"`

---

## 🔍 How to Find IDs

```bash
# Get all Sites
GET /api/master-data/sites

# Get all Projectors
GET /api/master-data/projectors

# Get all Audis
GET /api/master-data/audis

# Get all Users (for assignedTo)
GET /api/users
```

---

## 💡 Pro Tips

1. **Always copy IDs** from the response after creating entities
2. **Check enums** - they're case-sensitive (`"open"` not `"Open"`)
3. **Test with GET** first to see what data you already have
4. **Use Postman** - it auto-saves the token and formats responses
5. **Foreign keys** - Create parent entities (Site, Projector) before children (Audi, DTR)

---

**Need the full flow?** See `CREATE_DTR_GUIDE.md`  
**Need API docs?** See `API.md`  
**Need testing guide?** See `TESTING_GUIDE.md`




