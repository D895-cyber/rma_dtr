# 🔧 Fix AUTO-XXX Audis Guide

## 📋 Overview

This guide explains how to fix AUTO-XXX audis that were created during DTR import. The script will:
1. ✅ Verify your Excel file structure
2. ✅ Read correct audi numbers, site names, and models from your Excel data
3. ✅ Update AUTO-XXX audis with the correct information
4. ✅ Update projector models if needed
5. ✅ Link projectors to existing audis if they already exist

---

## 🚀 Quick Start

### **Step 1: Verify Your Excel Files**

Make sure your Excel files are in `backend/data/` folder:

- ✅ `dtr_cases.xlsx` - Must have columns: `serialNumber`, `siteName`, `audiNo`, `unitModel`
- ✅ `audis.xlsx` - Must have columns: `audiNo`, `siteName`, `serialNumber` (optional but recommended)
- ✅ `sites.xlsx` - Must have column: `siteName`

### **Step 2: Run the Fix Script**

```bash
cd backend
npm run fix:auto-audis
```

---

## 📊 What the Script Does

### **1. Verifies Excel Structure**
- Checks if required files exist
- Validates column names
- Shows sample data from each file
- Reports any missing columns

### **2. Creates Data Mapping**
- Reads DTR cases to get: serial number → audi number, site name, model
- Reads audis Excel to get: serial number → audi number, site name
- Combines both sources (audis Excel takes priority)

### **3. Finds AUTO-XXX Audis**
- Searches for all audis with names starting with "AUTO-"
- Includes their projector and site information

### **4. Updates Each Audi**
For each AUTO-XXX audi:
- ✅ Matches by projector serial number
- ✅ Finds correct site by site name
- ✅ Updates audi number from Excel data
- ✅ Updates site if different
- ✅ Creates/updates projector model if `unitModel` is provided
- ✅ Links projector to existing audi if audi already exists (and deletes AUTO-XXX)

---

## 📝 Excel File Requirements

### **dtr_cases.xlsx**

Required columns:
- `serialNumber` or `unitSerial` - Projector serial number
- `siteName` - Site name (must match sites.xlsx)
- `audiNo` - Audi number (e.g., "1", "Audi 1", "Screen 1")
- `unitModel` - Projector model (e.g., "CP2220", "CP2230")

Example:
```
serialNumber | siteName                          | audiNo | unitModel
479021012   | Andhra Pradesh Vijayawada Ripples | 1      | CP2220
475184008   | Andhra Pradesh Vijayawada Ripples | 2      | CP2220
```

### **audis.xlsx** (Optional but Recommended)

Required columns:
- `audiNo` - Audi number
- `siteName` - Site name
- `serialNumber` - Projector serial number

Example:
```
audiNo | siteName                          | serialNumber
1      | Andhra Pradesh Vijayawada Ripples | 479021012
2      | Andhra Pradesh Vijayawada Ripples | 475184008
```

### **sites.xlsx**

Required columns:
- `siteName` - Site name

Example:
```
siteName
Andhra Pradesh Vijayawada Ripples Mall
Andhra Pradesh Narsipatnan Sree Kanya
```

---

## 🔍 Example Output

```
╔══════════════════════════════════════════════════════════════════╗
║           Fixing AUTO-XXX Audis with Original Data              ║
╚══════════════════════════════════════════════════════════════════╝

📋 Verifying Excel File Structure...

📄 dtr_cases.xlsx:
   Total rows: 150
   Columns found: caseNumber, errorDate, serialNumber, siteName, audiNo, unitModel, ...
   ✅ All required columns present
   Sample row:
      serialNumber: 479021012
      siteName: Andhra Pradesh Vijayawada Ripples Mall
      audiNo: 1
      unitModel: CP2220

📖 Reading DTR cases data...
   Found 150 DTR cases

📖 Reading audis data...
   Found 25 audis

📊 Created mapping for 175 projectors

🔍 Finding AUTO-XXX audis...
   Found 9 AUTO-XXX audis

✅ Updated AUTO-555 → 1 at Andhra Pradesh Vijayawada Ripples Mall (Serial: 479021012)
✅ Updated AUTO-556 → 2 at Andhra Pradesh Vijayawada Ripples Mall (Serial: 475184008)
   ℹ️  Created projector model: CP2220
✅ Updated AUTO-557 → 3 at Andhra Pradesh Vijayawada Ripples Mall (Serial: 479021013)

╔══════════════════════════════════════════════════════════════════╗
║                        Summary                                   ║
╚══════════════════════════════════════════════════════════════════╝

✅ Updated: 9
⏭️  Skipped: 0
❌ Errors: 0
📊 Total: 9
```

---

## ⚠️ Important Notes

### **Before Running:**
1. ✅ Make sure your Excel files are up to date
2. ✅ Backup your database (recommended)
3. ✅ Ensure sites are imported first
4. ✅ Check that site names in DTR/audis match exactly with sites.xlsx

### **What Happens:**
- ✅ AUTO-XXX audis are renamed to correct audi numbers
- ✅ Sites are updated if they were wrong
- ✅ Projector models are created/updated if `unitModel` is provided
- ✅ If an audi with the correct number already exists, the projector is linked to it and AUTO-XXX is deleted

### **If Audi Already Exists:**
If the script finds that an audi with the correct number already exists at the site:
- It will link the projector to the existing audi
- Delete the AUTO-XXX audi
- This prevents duplicates

---

## 🐛 Troubleshooting

### **Error: "Site not found"**
- Check that site names in DTR/audis Excel match exactly with sites.xlsx
- Run sites import first: `npm run import:bulk` (sites only)

### **Error: "No data found for AUTO-XXX"**
- Check that the serial number in the AUTO-XXX audi matches a serial number in your Excel files
- Verify the serial number column name is correct (`serialNumber` or `unitSerial`)

### **Warning: "Missing columns"**
- Add the missing columns to your Excel file
- Make sure column names match exactly (case-sensitive)

### **Audi Not Updated**
- Check console output for specific error messages
- Verify serial number matches between database and Excel
- Ensure site name exists in sites table

---

## 📋 Checklist

Before running the script:
- [ ] Excel files are in `backend/data/` folder
- [ ] `dtr_cases.xlsx` has `serialNumber`, `siteName`, `audiNo`, `unitModel` columns
- [ ] `audis.xlsx` has `audiNo`, `siteName`, `serialNumber` columns (optional)
- [ ] `sites.xlsx` has `siteName` column
- [ ] Site names match exactly between files
- [ ] Database is backed up (recommended)

After running:
- [ ] Check summary output
- [ ] Verify audis in UI show correct names
- [ ] Check that sites are correct
- [ ] Verify projector models are correct

---

## 🔄 Re-running the Script

You can safely re-run the script multiple times:
- ✅ It will only update AUTO-XXX audis
- ✅ It won't affect already-correct audis
- ✅ It will skip audis that don't have matching data

---

## 💡 Tips

1. **Use audis.xlsx for better accuracy** - If you have an audis Excel file, it will take priority over DTR data
2. **Check the verification output first** - The script shows what it found before making changes
3. **Review the summary** - Always check the summary to see what was updated
4. **Fix site names first** - If site names don't match, fix them in Excel before running

---

## 📞 Need Help?

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your Excel file structure matches the requirements
3. Ensure all required columns are present
4. Check that site names match exactly

---

## ✅ Success Criteria

After running the script successfully:
- ✅ No AUTO-XXX audis remain (or only those without matching data)
- ✅ Audi numbers match your Excel data
- ✅ Sites are correct
- ✅ Projector models are correct (if provided in Excel)

---

**Ready to fix your AUTO-XXX audis? Run:**
```bash
cd backend
npm run fix:auto-audis
```

