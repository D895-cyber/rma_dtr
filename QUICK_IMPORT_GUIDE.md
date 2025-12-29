# 🚀 Quick Data Import Guide

## 📋 **Step-by-Step: Import Your Old Data**

---

## **Option 1: Excel Import (Recommended for Bulk Data)**

### **Step 1: Prepare Excel Files**

Create Excel files with these exact column headers and place them in:
```
backend/data/
```

#### **📁 1. sites.xlsx**
```
siteName | location | contactPerson | contactNumber
```
**Example:**
```
PVR Phoenix Mall Mumbai | Mumbai, Maharashtra | John Doe | +91-9876543210
INOX Garuda Mall Bangalore | Bangalore, Karnataka | Jane Smith | +91-9876543211
```

#### **📁 2. projector_models.xlsx**
```
modelNo | manufacturer | specifications
```
**Example:**
```
CP2220 | Christie | 4K DLP Cinema Projector, 22,000 lumens
CP2230 | Christie | 4K DLP Cinema Projector, 25,000 lumens
```

#### **📁 3. projectors.xlsx**
```
serialNumber | modelNo | status | installationDate | notes
```
**Example:**
```
411034563 | CP2230 | active | 2023-01-15 | Installed in Audi 2
411034564 | CP2230 | active | 2023-01-15 | Installed in Audi 3
```

#### **📁 4. audis.xlsx**
```
audiNo | siteName | serialNumber
```
**Example:**
```
Audi 1 | PVR Phoenix Mall Mumbai | 411034563
Audi 2 | PVR Phoenix Mall Mumbai | 411034564
```

#### **📁 5. dtr_cases.xlsx**
```
caseNumber | errorDate | siteName | audiNo | unitModel | unitSerial | natureOfProblem | actionTaken | remarks | callStatus | caseSeverity | createdBy | assignedTo
```
**Example:**
```
251279 | 2024-12-09 | PVR Phoenix Mall Mumbai | Audi 2 | CP2230 | 411034563 | HORIZONTAL BARS VISIBLE | Checked connections | Under warranty | open | high | admin@crm.com | 
```

#### **📁 6. rma_cases.xlsx** ⭐ Updated with all fields!
```
rmaType | callLogNumber | rmaNumber | rmaOrderNumber | rmaRaisedDate | customerErrorDate | siteName | audiNo | productName | productPartNumber | serialNumber | defectDetails | defectivePartName | defectivePartNumber | defectivePartSerial | isDefectivePartDNR | defectivePartDNRReason | replacedPartNumber | replacedPartSerial | symptoms | shippingCarrier | trackingNumberOut | shippedDate | returnTrackingNumber | returnShippedDate | returnShippedThrough | status | createdBy | assignedTo | notes
```
**Example:**
```
RMA | 694531 | 176141 | 300061 | 2024-12-09 | 2024-12-09 | PVR Phoenix Mall Mumbai | Audi 2 | CP2230 | 000-001195-01 | 411034563 | HORIZONTAL BARS VISIBLE ON SCREEN | Assy. Ballast | 000-001195-01 | C283631016 | false | | 000-001195-01 | C283631012 | HORIZONTAL BARS VISIBLE ON SCREEN | CDS | CDS | 2024-12-09 | 100010106807 | 2024-12-10 | DTDC | open | admin@crm.com | | By CDS
```

**Note:** Empty fields can be left blank in Excel. Use `false` for boolean fields.

---

### **Step 2: Run Import Script**

```bash
cd backend
npm run import:bulk
```

**Or:**
```bash
npm run import:excel
```

The script will:
1. ✅ Import Sites
2. ✅ Import Projector Models  
3. ✅ Import Projectors
4. ✅ Import Audis
5. ✅ Import DTR Cases
6. ✅ Import RMA Cases
7. ✅ Show summary with success/failed counts

---

### **Step 3: Verify Import**

1. **Login to CRM**
2. **Check each section:**
   - Master Data → Sites (should show your sites)
   - Models → Projector Models (should show your models)
   - Parts → (add parts if needed)
   - Master Data → Expand sites to see Audis
   - DTR Cases → Should show imported cases
   - RMA Cases → Should show imported cases

---

## **Option 2: Manual Entry (Best for Small Data)**

### **Step 1: Add Sites**
1. Login → Master Data tab
2. Click "+ Add New Site"
3. Enter site name
4. Click "Add Site"
5. Repeat for all sites

### **Step 2: Add Projector Models**
1. Go to "Models" tab
2. Click "+ Add Model"
3. Enter Model Number (e.g., CP2220)
4. Enter Manufacturer (optional)
5. Enter Specifications (optional)
6. Click "Create Model"
7. Repeat for all models

### **Step 3: Add Parts (Optional)**
1. Go to "Parts" tab
2. Click "+ Add Part"
3. Select Model from dropdown
4. Enter Part Name, Part Number, Category
5. Click "Create Part"
6. Repeat for all parts

### **Step 4: Add Physical Projectors**
1. Go to "Master Data" tab
2. Click "+ Add New Projector"
3. Enter Serial Number
4. Select Model from dropdown
5. Enter status, installation date
6. Click "Add Projector"
7. Repeat for all projectors

### **Step 5: Add Audis**
1. In Master Data, expand a Site
2. Click "+ Add Audi"
3. Enter Audi Number
4. Select Projector (optional)
5. Click "Add Audi"
6. Repeat for all audis

### **Step 6: Create DTR/RMA Cases**
1. Go to "DTR Cases" or "RMA Cases"
2. Click "+ New Case"
3. Fill in the form
4. Submit

---

## **Option 3: API Import (For Automation)**

### **Step 1: Get Auth Token**

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin@123"}'
```

Save the `token` from response.

### **Step 2: Import Sites**

```bash
curl -X POST http://localhost:5001/api/master-data/sites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"siteName":"PVR Phoenix Mall Mumbai"}'
```

### **Step 3: Import Models**

```bash
curl -X POST http://localhost:5001/api/master-data/projector-models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"modelNo":"CP2220","manufacturer":"Christie"}'
```

### **Step 4: Continue with other entities...**

---

## **⚠️ Important Notes:**

### **Import Order (CRITICAL!):**
```
1. Sites          (no dependencies)
2. Models         (no dependencies)  
3. Projectors     (needs Models)
4. Audis          (needs Sites + Projectors)
5. DTR Cases      (needs Sites + Audis)
6. RMA Cases      (needs Sites + Audis)
7. Parts          (needs Models) - Optional
```

### **Date Format:**
- ✅ Use: `YYYY-MM-DD` (e.g., `2024-12-09`)
- ❌ Don't use: `12/09/2024`, `Dec 9, 2024`

### **Required Fields:**
- **Sites:** `siteName`
- **Models:** `modelNo`
- **Projectors:** `serialNumber`, `modelNo` (must exist)
- **Audis:** `audiNo`, `siteName` (must exist)
- **DTR:** `caseNumber`, `errorDate`, `siteName`, `createdBy`
- **RMA:** `rmaRaisedDate`, `customerErrorDate`, `siteName`, `productName`, `serialNumber`, `createdBy`

### **User Emails:**
- All `createdBy` and `assignedTo` fields must be valid user emails
- Default: `admin@crm.com` (always exists)

---

## **🔍 Troubleshooting:**

### **Error: "Foreign key constraint violated"**
**Solution:** Import parent data first (Sites before Audis, Models before Projectors)

### **Error: "Duplicate entry"**
**Solution:** Check for duplicate site names, serial numbers, or model numbers

### **Error: "User not found"**
**Solution:** Use `admin@crm.com` or create users first via User Management page

### **Error: "Invalid date"**
**Solution:** Use YYYY-MM-DD format (e.g., 2024-12-09)

---

## **📊 Excel Template Checklist:**

Before importing, verify:
- [ ] All Excel files have correct column headers
- [ ] Dates are in YYYY-MM-DD format
- [ ] Site names match exactly (case-sensitive)
- [ ] Model numbers match exactly
- [ ] Serial numbers are unique
- [ ] User emails exist in system
- [ ] Files are saved in `backend/data/` folder

---

## **🚀 Quick Start Commands:**

```bash
# 1. Navigate to backend
cd backend

# 2. Ensure data folder exists
mkdir -p data

# 3. Place your Excel files in data/ folder

# 4. Run import
npm run import:bulk

# 5. Check results in console
# 6. Verify in CRM UI
```

---

## **💡 Tips:**

1. **Start Small:** Test with 5-10 records first
2. **Backup:** Keep original Excel files
3. **Verify:** Check data after each import step
4. **Fix Errors:** Import script shows which records failed
5. **Re-run Safe:** Script handles duplicates (skips existing)

---

## **Need Help?**

1. Check `backend/data/` folder has your Excel files
2. Run import script and check console output
3. Look for error messages - they tell you what's wrong
4. Start with Sites and Models first (simplest)

---

**Ready to import? Follow Option 1 (Excel Import) - it's the fastest!** 🚀








