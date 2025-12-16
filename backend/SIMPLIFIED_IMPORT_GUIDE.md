# 🚀 Simplified RMA & DTR Import Guide (Serial Number Mapping)

## ✅ Smart Approach: Auto-Lookup by Serial Number!

Instead of manually entering site names, model numbers, and audi numbers, just provide the **serial number** and the system automatically looks up all related data!

---

## 📋 DTR Cases - Simplified Template

### Required Columns (Just 7!):
```
caseNumber, errorDate, serialNumber, natureOfProblem, 
callStatus, caseSeverity, createdBy
```

### Optional Columns:
```
actionTaken, remarks, assignedTo
```

### How It Works:
1. You provide: **serialNumber** (e.g., "411034563")
2. System looks up:
   - ✅ Projector (by serial number)
   - ✅ Projector Model (from projector)
   - ✅ Audi (which has this projector)
   - ✅ Site (which has this audi)
3. Auto-fills: `unitModel`, `unitSerial`, `siteId`, `audiId`, `siteName`, `audiNo`

### Example DTR Row:
| caseNumber | errorDate  | serialNumber | natureOfProblem | callStatus | caseSeverity | createdBy | actionTaken | remarks |
|------------|------------|--------------|-----------------|------------|--------------|-----------|-------------|---------|
| DTR-001    | 2024-12-09 | 411034563    | HORIZONTAL BARS | open       | high         | admin@crm.com | Checked lamp | Warranty |

**That's it!** No need to enter site name, audi no, or model!

---

## 📦 RMA Cases - Simplified Template

### Required Columns (Just 9!):
```
rmaType, rmaRaisedDate, customerErrorDate, serialNumber,
defectDetails, status, createdBy
```

Plus defect & replacement part details (if applicable)

### Optional Columns:
```
callLogNumber, rmaNumber, rmaOrderNumber, productPartNumber,
defectivePartName, defectivePartNumber, defectivePartSerial,
isDefectivePartDNR, defectivePartDNRReason,
replacedPartNumber, replacedPartSerial, symptoms,
shippingCarrier, trackingNumberOut, shippedDate,
returnTrackingNumber, returnShippedDate, returnShippedThrough,
assignedTo, notes
```

### How It Works:
1. You provide: **serialNumber** (e.g., "411034563")
2. System looks up:
   - ✅ Projector (by serial number)
   - ✅ Projector Model (for product name)
   - ✅ Audi (which has this projector)
   - ✅ Site (which has this audi)
3. Auto-fills: `productName`, `siteId`, `audiId`, `siteName`, `audiNo`

### Example RMA Row (Basic):
| rmaType | rmaRaisedDate | customerErrorDate | serialNumber | defectDetails | status | createdBy |
|---------|---------------|-------------------|--------------|---------------|--------|-----------|
| RMA     | 2024-12-09    | 2024-12-09        | 411034563    | BARS ON SCREEN| open   | admin@crm.com |

### Example RMA Row (Full):
| rmaType | callLogNumber | rmaNumber | rmaRaisedDate | serialNumber | defectDetails | defectivePartName | defectivePartNumber | replacedPartNumber | status | createdBy |
|---------|---------------|-----------|---------------|--------------|---------------|-------------------|---------------------|-------------------|--------|-----------|
| RMA     | 694531        | 176141    | 2024-12-09    | 411034563    | BARS ON SCREEN| Assy. Ballast     | 000-001195-01       | 000-001195-01     | open   | admin@crm.com |

---

## 🎯 Benefits of Serial Number Mapping

### Before (Old Method):
```excel
siteName, audiNo, unitModel, unitSerial, productName...
```
- ❌ Manual entry of duplicate data
- ❌ Risk of typos in site names
- ❌ Risk of wrong model numbers
- ❌ Risk of mismatched audi numbers
- ❌ 13+ columns to fill for DTR
- ❌ 30+ columns to fill for RMA

### After (New Method):
```excel
serialNumber
```
- ✅ Single serial number lookup
- ✅ Auto-fills: site, audi, model, product info
- ✅ No typos or mismatches
- ✅ Only 7 columns for DTR
- ✅ Only 9-15 columns for RMA (depending on details)
- ✅ **10x faster data entry!**

---

## ⚠️ Important Requirements

### For DTR:
1. **Serial number MUST exist** in projectors table
2. **Projector MUST be assigned** to an audi
3. **Audi MUST be at** a site

If any of these are missing, the import will fail with a clear error message.

### For RMA:
1. **Serial number MUST exist** in projectors table
2. **Projector should be assigned** to an audi (optional but recommended)
3. If no audi, you can manually provide `siteName` in Excel

---

## 📝 Column Reference

### DTR Required:
- `caseNumber` - Unique case ID
- `errorDate` - YYYY-MM-DD format
- `serialNumber` - Unit serial (looks up everything else!)
- `natureOfProblem` - Problem description
- `callStatus` - Values: open, in_progress, closed, escalated
- `caseSeverity` - Values: low, medium, high, critical
- `createdBy` - User email (default: admin@crm.com)

### DTR Optional:
- `actionTaken` - What was done
- `remarks` - Additional notes
- `assignedTo` - Assigned user email

### RMA Required:
- `rmaType` - Values: RMA, SRMA, RMA CL, Lamps
- `rmaRaisedDate` - YYYY-MM-DD
- `customerErrorDate` - YYYY-MM-DD
- `serialNumber` - Unit serial (looks up site, audi, model!)
- `defectDetails` - Defect description
- `status` - Values: open, rma-raised-yet-to-deliver, faulty-in-transit-to-cds, closed, cancelled
- `createdBy` - User email

### RMA Optional (commonly used):
- `callLogNumber` - Call log reference
- `rmaNumber` - PO number
- `rmaOrderNumber` - Order number
- `productPartNumber` - Product part number
- `defectivePartName` - Defective part name
- `defectivePartNumber` - Defective part number
- `defectivePartSerial` - Defective part serial
- `isDefectivePartDNR` - true/false (Do Not Return)
- `defectivePartDNRReason` - Reason for DNR
- `replacedPartNumber` - Replacement part number
- `replacedPartSerial` - Replacement serial
- `symptoms` - Symptoms description
- Shipping fields: shippingCarrier, trackingNumberOut, shippedDate
- Return fields: returnTrackingNumber, returnShippedDate, returnShippedThrough
- `assignedTo` - Assigned user email
- `notes` - Additional notes

---

## 🎯 Quick Start

1. **Open templates:**
   - `backend/data/dtr_cases.xlsx`
   - `backend/data/rma_cases.xlsx`

2. **Delete example rows** (keep header row)

3. **Fill in your data:**
   - Main requirement: **serialNumber**
   - Add other details (problem, dates, defect info, etc.)
   - Skip site/audi/model columns - system fills them!

4. **Save files**

5. **Import:**
   ```bash
   cd backend
   npm run import:bulk
   ```

6. **Done!** ✅

---

## 💡 Pro Tips

1. **Serial numbers are the key** - make sure they match projectors in database
2. **Dates must be YYYY-MM-DD** format
3. **Boolean values** use "true" or "false" (for isDefectivePartDNR)
4. **Empty optional fields** can be left blank
5. **User emails** must exist (use admin@crm.com as default)

---

## 🔍 Error Messages

If import fails, you'll see clear messages:

- "Projector with serial number 'XXX' not found" → Add this projector first
- "No audi found for projector 'XXX'" → Assign this projector to an audi first
- "User 'email@example.com' not found" → Use admin@crm.com or create this user first

---

## 🎉 Result

After import:
- ✅ DTR/RMA cases created with correct site, audi, model info
- ✅ All data automatically linked
- ✅ No manual errors
- ✅ 10x faster than manual entry!

**The system is smart now!** 🧠




