# 📊 Data Import Guide - Add Your Existing Data to CRM

## 🎯 **You Have 3 Options**

1. **Manual Entry** (Best for: Small data, ongoing use)
2. **Excel Import** (Best for: Bulk initial data)
3. **API Import** (Best for: Large data, automation)

---

## 📋 **Important: Data Import Order**

Due to database relationships, import data in this order:

```
1. Sites (no dependencies)
   ↓
2. Projector Models (no dependencies)
   ↓
3. Projectors (needs: Projector Models)
   ↓
4. Audis (needs: Sites, Projectors)
   ↓
5. DTR Cases (needs: Sites, Audis)
   ↓
6. RMA Cases (needs: Sites, Audis)
   ↓
7. Parts (needs: Projector Models) - Optional
```

---

## 🔧 **Option 1: Manual Entry via UI (Recommended for Start)**

### **Step 1: Add Sites**
1. Login to CRM (admin@crm.com / Admin@123)
2. Go to **"Master Data"** tab
3. Click **"+ Add New Site"**
4. Enter Site Name (e.g., "PVR Phoenix Mall Mumbai")
5. Click **"Add Site"**
6. Repeat for all sites

### **Step 2: Add Projector Models**
1. In Master Data, create Projector Models:
   - Model Number: "Christie CP2220"
   - Manufacturer: "Christie"
   - Specifications: "4K DLP Cinema Projector"
2. Repeat for all unique projector models

### **Step 3: Add Physical Projectors**
1. For each projector model, add physical units:
   - Serial Number: "CP2220-MUM-A1-001"
   - Link to Projector Model
   - Status: "Active"
   - Installation Date

### **Step 4: Add Audis**
1. Click on a Site to expand it
2. Click **"+ Add Audi"**
3. Enter:
   - Audi Number: "Audi 1" or "Screen 1"
   - Link to Projector (optional)
4. Click **"Add Audi"**

### **Step 5: Add DTR/RMA Cases**
1. Go to **"DTR Cases"** or **"RMA Cases"** tab
2. Click **"+ New DTR Case"** or **"+ New RMA Case"**
3. Fill in the form
4. Submit

---

## 📁 **Option 2: Excel Import (Best for Bulk Data)**

### **Excel File Templates**

Create Excel files with these exact column headers:

#### **1. sites.xlsx**
```
siteName | location | contactPerson | contactNumber
---------------------------------------------------------
PVR Phoenix Mall Mumbai | Mumbai, Maharashtra | John Doe | +91-9876543210
INOX Garuda Mall Bangalore | Bangalore, Karnataka | Jane Smith | +91-9876543211
```

#### **2. projector_models.xlsx**
```
modelNo | manufacturer | specifications
---------------------------------------------------------
Christie CP2220 | Christie Digital | 4K DLP Cinema Projector, 22,000 lumens
NEC NC1200C | NEC Display | 2K DLP Cinema Projector, 12,000 lumens
Barco DP2K-20C | Barco | 2K DLP Cinema Projector, 20,000 lumens
```

#### **3. projectors.xlsx**
```
serialNumber | modelNo | status | installationDate | notes
---------------------------------------------------------
CP2220-MUM-A1-001 | Christie CP2220 | active | 2023-01-15 | Installed in Audi 1
CP2220-MUM-A2-002 | Christie CP2220 | active | 2023-01-15 | Installed in Audi 2
NEC-DEL-A2-001 | NEC NC1200C | active | 2023-02-20 | Installed in Audi 2 Delhi
```

#### **4. audis.xlsx**
```
audiNo | siteName | serialNumber
---------------------------------------------------------
Audi 1 | PVR Phoenix Mall Mumbai | CP2220-MUM-A1-001
Audi 2 | PVR Phoenix Mall Mumbai | CP2220-MUM-A2-002
Screen 1 | INOX Garuda Mall Bangalore | CP2220-BLR-S1-004
```

#### **5. dtr_cases.xlsx**
```
caseNumber | errorDate | siteName | audiNo | unitModel | unitSerial | natureOfProblem | actionTaken | remarks | callStatus | caseSeverity | createdBy | assignedTo
---------------------------------------------------------
DTR-001 | 2024-12-01 | PVR Phoenix Mall Mumbai | Audi 1 | Christie CP2220 | CP2220-MUM-A1-001 | No image output | Checked lamp hours, lamp needs replacement | Under warranty | open | high | admin@crm.com | engineer@crm.com
```

#### **6. rma_cases.xlsx**
```
rmaType | callLogNumber | rmaNumber | rmaOrderNumber | rmaRaisedDate | customerErrorDate | siteName | audiNo | productName | productPartNumber | serialNumber | symptoms | status | createdBy | assignedTo
---------------------------------------------------------
RMA | CL-001 | PO-2024-001 | ORD-RMA-001 | 2024-12-05 | 2024-12-03 | PVR Phoenix Mall Mumbai | Audi 1 | Christie CP2220 | CP2220 | CP2220-MUM-A1-001 | Lamp failure after 2500 hours | open | admin@crm.com | engineer@crm.com
```

### **Import Script Usage**

I'll create an enhanced import script for you:

#### **Step 1: Place Excel Files**
```bash
backend/
  data/
    sites.xlsx
    projector_models.xlsx
    projectors.xlsx
    audis.xlsx
    dtr_cases.xlsx
    rma_cases.xlsx
```

#### **Step 2: Run Import**
```bash
cd backend
npm run import:excel
```

---

## 🔌 **Option 3: API Import (Advanced)**

### **Using Postman or cURL**

#### **1. Login First**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin@123"}'
```

Save the token from response.

#### **2. Import Sites**
```bash
curl -X POST http://localhost:5001/api/master-data/sites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"siteName":"PVR Phoenix Mall Mumbai","location":"Mumbai","contactPerson":"John Doe","contactNumber":"+91-9876543210"}'
```

#### **3. Import Projector Models**
```bash
curl -X POST http://localhost:5001/api/master-data/projector-models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"modelNo":"Christie CP2220","manufacturer":"Christie Digital","specifications":"4K DLP Cinema Projector"}'
```

#### **4. Import Projectors**
```bash
curl -X POST http://localhost:5001/api/master-data/projectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"serialNumber":"CP2220-MUM-A1-001","projectorModelId":"<MODEL_ID>","status":"active","installationDate":"2023-01-15"}'
```

---

## 🎯 **Recommended Workflow**

### **For Your Existing Data:**

**Day 1: Setup Master Data**
1. Create Excel files for Sites and Projector Models
2. Import using Excel script or manual entry
3. Verify data in CRM

**Day 2: Setup Physical Units**
1. Create Excel file for Projectors
2. Link each projector to its model
3. Create Excel file for Audis
4. Link each audi to site and projector
5. Import and verify

**Day 3: Import Historical Cases**
1. Create Excel files for DTR and RMA cases
2. Import historical data
3. Verify all relationships are correct

---

## 📝 **Excel Import Script**

Let me create an enhanced import script for you:

**Features:**
- ✅ Validates data before import
- ✅ Shows progress
- ✅ Handles errors gracefully
- ✅ Creates relationships automatically
- ✅ Supports all entity types

**Usage:**
```bash
# Place your Excel files in backend/data/
cd backend
npm run import:excel

# Or import specific file:
npm run import:excel -- --file sites.xlsx
```

---

## 🔍 **Validation Checklist**

Before importing, ensure:

**Sites:**
- [ ] All site names are unique
- [ ] Contact information is valid

**Projector Models:**
- [ ] Model numbers are unique
- [ ] Manufacturer names are consistent

**Projectors:**
- [ ] Serial numbers are unique
- [ ] Each serial number links to existing model

**Audis:**
- [ ] Audi numbers are unique per site
- [ ] Site names match existing sites
- [ ] Serial numbers match existing projectors

**DTR/RMA Cases:**
- [ ] Site names match existing sites
- [ ] Audi numbers match existing audis
- [ ] Serial numbers match existing projectors
- [ ] Dates are in YYYY-MM-DD format
- [ ] Status values are valid (open, closed, etc.)

---

## 💡 **Tips for Large Data**

1. **Start Small:** Import 5-10 records first to test
2. **Batch Import:** Import in batches of 100-500 records
3. **Verify Each Step:** Check data after each import
4. **Backup:** Keep original Excel files as backup
5. **Use API for Automation:** Script repeated imports

---

## 🆘 **Common Issues**

### **Issue 1: Foreign Key Error**
**Error:** "Foreign key constraint violated"
**Solution:** Import parent data first (Sites before Audis, Models before Projectors)

### **Issue 2: Duplicate Entry**
**Error:** "Duplicate entry"
**Solution:** Check for duplicate site names, serial numbers, or model numbers

### **Issue 3: Invalid Date Format**
**Error:** "Invalid date"
**Solution:** Use YYYY-MM-DD format (e.g., 2024-12-08)

### **Issue 4: Missing Required Field**
**Error:** "Missing required fields"
**Solution:** Check all required fields are filled in Excel

---

## 📞 **Need Help?**

1. Check backend logs for detailed errors
2. Use Postman to test individual API calls
3. Verify data format matches templates
4. Start with manual entry for small data sets

---

## 🎉 **Summary**

**Quick Start (Manual):**
1. Login to CRM
2. Add Sites in Master Data
3. Add Projector Models
4. Add Projectors
5. Add Audis
6. Create DTR/RMA cases

**Bulk Import (Excel):**
1. Prepare Excel files with templates
2. Place in `backend/data/` folder
3. Run `npm run import:excel`
4. Verify in CRM

**Choose what works best for your data size!** 🚀




