# RMA & DTR Excel Import Format Guide

## 📋 DTR Cases Excel Template

### Required Columns:
1. **caseNumber** - Unique case number (e.g., "DTR-001", "251279")
2. **errorDate** - Date of error (format: YYYY-MM-DD, e.g., "2024-12-09")
3. **siteName** - Site name (must match existing site in database)
4. **audiNo** - Audi number (must match existing audi at that site)
5. **unitModel** - Model number of the unit (e.g., "CP2230")
6. **unitSerial** - Serial number of the unit (e.g., "411034563")
7. **natureOfProblem** - Description of the problem
8. **callStatus** - Status of the call (valid values: "open", "in_progress", "closed", "escalated")
9. **caseSeverity** - Severity level (valid values: "low", "medium", "high", "critical")
10. **createdBy** - Email of user who created (must exist in database, e.g., "admin@crm.com")

### Optional Columns:
11. **actionTaken** - Action taken to resolve (can be empty)
12. **remarks** - Additional remarks (can be empty)
13. **assignedTo** - Email of assigned user (can be empty)

### Example DTR Row:
```
caseNumber: DTR-001
errorDate: 2024-12-09
siteName: Punjab Mohali VR Punjab Mall
audiNo: 1
unitModel: CP2230
unitSerial: 411034563
natureOfProblem: HORIZONTAL BARS VISIBLE ON SCREEN
actionTaken: Checked connections and lamp hours
remarks: Under warranty
callStatus: open
caseSeverity: high
createdBy: admin@crm.com
assignedTo: 
```

---

## 📦 RMA Cases Excel Template

### Required Columns:
1. **rmaType** - Type of RMA (valid values: "RMA", "SRMA", "RMA CL", "Lamps")
2. **rmaRaisedDate** - Date RMA was raised (format: YYYY-MM-DD)
3. **customerErrorDate** - Date customer reported error (format: YYYY-MM-DD)
4. **siteName** - Site name (must match existing site)
5. **productName** - Product model name (e.g., "CP2230")
6. **productPartNumber** - Product part number (e.g., "000-001195-01")
7. **serialNumber** - Unit serial number (e.g., "411034563")
8. **status** - RMA status (valid values: "open", "rma-raised-yet-to-deliver", "faulty-in-transit-to-cds", "closed", "cancelled")
9. **createdBy** - Email of user who created (must exist, e.g., "admin@crm.com")

### Optional Columns:
10. **callLogNumber** - Call log number (numeric, NOT linked to DTR)
11. **rmaNumber** - PO number (optional)
12. **rmaOrderNumber** - Order number (optional)
13. **audiNo** - Audi number (optional, but recommended)
14. **defectDetails** - Details of the defect
15. **defectivePartNumber** - Part number of defective part
16. **defectivePartName** - Name of defective part (e.g., "Assy. Ballast")
17. **defectivePartSerial** - Serial number of defective part
18. **isDefectivePartDNR** - Do Not Return flag (values: "true" or "false")
19. **defectivePartDNRReason** - Reason for DNR (if isDefectivePartDNR is true)
20. **replacedPartNumber** - Part number of replacement
21. **replacedPartSerial** - Serial number of replacement
22. **symptoms** - Symptoms description
23. **shippingCarrier** - Carrier name (e.g., "CDS", "DTDC")
24. **trackingNumberOut** - Outbound tracking number
25. **shippedDate** - Date shipped (format: YYYY-MM-DD)
26. **returnShippedDate** - Date defective returned (format: YYYY-MM-DD)
27. **returnTrackingNumber** - Return tracking number
28. **returnShippedThrough** - Return carrier name
29. **assignedTo** - Email of assigned user (can be empty)
30. **notes** - Additional notes

### Example RMA Row:
```
rmaType: RMA
callLogNumber: 694531
rmaNumber: 176141
rmaOrderNumber: 300061
rmaRaisedDate: 2024-12-09
customerErrorDate: 2024-12-09
siteName: Punjab Mohali VR Punjab Mall
audiNo: 1
productName: CP2230
productPartNumber: 000-001195-01
serialNumber: 411034563
defectDetails: HORIZONTAL BARS VISIBLE ON SCREEN
defectivePartName: Assy. Ballast
defectivePartNumber: 000-001195-01
defectivePartSerial: C283631016
isDefectivePartDNR: false
defectivePartDNRReason: 
replacedPartNumber: 000-001195-01
replacedPartSerial: C283631012
symptoms: HORIZONTAL BARS VISIBLE ON SCREEN
shippingCarrier: CDS
trackingNumberOut: CDS123
shippedDate: 2024-12-09
returnShippedDate: 2024-12-10
returnTrackingNumber: 100010106807
returnShippedThrough: DTDC
status: open
createdBy: admin@crm.com
assignedTo: 
notes: By CDS
```

---

## ⚠️ Important Notes:

1. **Dates**: Must be in YYYY-MM-DD format (e.g., 2024-12-09)
2. **Site Names**: Must match exactly (case-sensitive) with existing sites
3. **Audi Numbers**: Must exist at the specified site
4. **User Emails**: Must exist in the Users table (default: admin@crm.com)
5. **Boolean Values**: Use "true" or "false" (lowercase)
6. **Empty Values**: Can be left blank for optional fields
7. **Serial Numbers**: Will be converted to strings automatically
8. **Status Values**: Must use exact values from the valid lists above

---

## 🔄 Valid Values Reference:

### DTR Call Status:
- open
- in_progress
- closed
- escalated

### DTR Case Severity:
- low
- medium
- high
- critical

### RMA Type:
- RMA
- SRMA
- RMA CL
- Lamps

### RMA Status:
- open (Case is open, observation ongoing)
- rma-raised-yet-to-deliver (Replacement part yet to deliver)
- faulty-in-transit-to-cds (Defective part in transit to us)
- closed (RMA completed)
- cancelled (RMA cancelled)

---

## 📁 Excel File Names:

Place your files in: `backend/data/`

- DTR Cases: `dtr_cases.xlsx`
- RMA Cases: `rma_cases.xlsx`

After preparing your files, run: `npm run import:bulk`

