# DTR Excel File - Required Fields Reference

## 📋 Required Fields for DTR Cases Excel Import

### ✅ **REQUIRED COLUMNS** (Must be present in Excel file):

1. **caseNumber** (Required)
   - Type: String
   - Format: Unique case identifier (e.g., "DTR-001", "251279")
   - Example: `DTR-001`
   - Note: Must be unique. If duplicate exists, system will append suffix.

2. **errorDate** (Required)
   - Type: Date
   - Format: YYYY-MM-DD (e.g., "2024-12-09")
   - Example: `2024-12-09`
   - Note: Date when the error occurred

3. **serialNumber** OR **unitSerial** (Required)
   - Type: String/Number (will be converted to string)
   - Format: Unit serial number
   - Example: `411034563`
   - Note: System uses this to auto-lookup projector, audi, and site

4. **natureOfProblem** (Required)
   - Type: String/Text
   - Format: Description of the problem
   - Example: `HORIZONTAL BARS VISIBLE ON SCREEN`
   - Note: Cannot be empty

5. **callStatus** (Required)
   - Type: String (Enum)
   - **Valid Values:**
     - `open` - Case is open, observation ongoing
     - `in_progress` - Case is in progress
     - `closed` - Case is closed
     - `escalated` - Case escalated to RMA
   - Default: `open` (if not provided)
   - Example: `open`
   - Note: Case-insensitive, spaces converted to underscores

6. **caseSeverity** (Required)
   - Type: String (Enum)
   - **Valid Values:**
     - `low` - Low severity
     - `medium` - Medium severity (default if not provided)
     - `high` - High severity
     - `critical` - Critical severity
   - Default: `medium` (if not provided)
   - Example: `high`
   - Note: Case-insensitive

7. **createdBy** (Required)
   - Type: String (Email)
   - Format: Email address of user who created the case
   - Example: `admin@crm.com`
   - Note: User must exist in database

---

### ⭕ **OPTIONAL COLUMNS** (Can be empty):

8. **actionTaken** (Optional)
   - Type: String/Text
   - Format: Description of action taken
   - Example: `Checked connections and lamp hours`
   - Default: Empty string if not provided

9. **remarks** (Optional)
   - Type: String/Text
   - Format: Additional remarks or notes
   - Example: `Under warranty`
   - Default: `null` if not provided

10. **assignedTo** (Optional)
    - Type: String (Email)
    - Format: Email address of assigned engineer
    - Example: `engineer@crm.com`
    - Note: User must exist in database if provided
    - Default: `null` (unassigned) if not provided

11. **siteName** (Optional - Auto-looked up)
    - Type: String
    - Format: Site name
    - Note: Auto-populated from serial number lookup
    - Can be provided manually if needed

12. **audiNo** (Optional - Auto-looked up)
    - Type: String
    - Format: Audi number
    - Note: Auto-populated from serial number lookup
    - Can be provided manually if needed

13. **unitModel** (Optional - Auto-looked up)
    - Type: String
    - Format: Projector model number
    - Note: Auto-populated from serial number lookup
    - Example: `CP2230`

14. **unitSerial** (Optional - Alternative to serialNumber)
    - Type: String/Number
    - Format: Unit serial number
    - Note: Used if `serialNumber` is not provided

---

## 🔄 Call Status Value Mapping

The system automatically maps common variations to valid values:

| Excel Value | Mapped To | Notes |
|------------|-----------|-------|
| `observation` | `open` | Auto-mapped |
| `waiting_cust_responses` | `in_progress` | Auto-mapped |
| `rma_part_return_to_cds` | `closed` | Auto-mapped |
| `open` | `open` | Valid |
| `in_progress` | `in_progress` | Valid |
| `in-progress` | `in_progress` | Auto-converted |
| `closed` | `closed` | Valid |
| `escalated` | `escalated` | Valid |

**Note:** Values are case-insensitive and spaces are converted to underscores.

---

## 📝 Example DTR Excel Row

```csv
caseNumber,errorDate,serialNumber,natureOfProblem,callStatus,caseSeverity,createdBy,actionTaken,remarks,assignedTo
DTR-001,2024-12-09,411034563,HORIZONTAL BARS VISIBLE ON SCREEN,open,high,admin@crm.com,Checked connections and lamp hours,Under warranty,
```

---

## ⚠️ Important Notes:

1. **Serial Number is Key**: The system uses `serialNumber` (or `unitSerial`) to automatically:
   - Find the projector
   - Find the audi that has this projector
   - Find the site that has this audi
   - Auto-populate `unitModel`, `siteId`, `audiId`, `siteName`, `audiNo`

2. **Call Status Validation**:
   - Must be one of: `open`, `in_progress`, `closed`, `escalated`
   - Defaults to `open` if not provided
   - Case-insensitive
   - Spaces converted to underscores

3. **Case Severity Validation**:
   - Must be one of: `low`, `medium`, `high`, `critical`
   - Defaults to `medium` if not provided
   - Case-insensitive

4. **User Validation**:
   - `createdBy` email must exist in Users table
   - `assignedTo` email must exist in Users table (if provided)

5. **Date Format**:
   - Must be YYYY-MM-DD format
   - Example: `2024-12-09`

6. **Required Field Validation**:
   - `caseNumber` - Cannot be empty
   - `errorDate` - Cannot be empty
   - `serialNumber` or `unitSerial` - At least one must be provided
   - `natureOfProblem` - Cannot be empty
   - `callStatus` - Will default to `open` if not provided
   - `caseSeverity` - Will default to `medium` if not provided
   - `createdBy` - Cannot be empty, must be valid user email

---

## 🚨 Common Errors:

1. **Missing serialNumber**: 
   - Error: "Serial number is required"
   - Fix: Provide `serialNumber` or `unitSerial` column

2. **Invalid callStatus**:
   - Error: May cause import issues
   - Fix: Use one of: `open`, `in_progress`, `closed`, `escalated`

3. **User not found**:
   - Error: `User "email@example.com" not found`
   - Fix: Ensure user exists in database or use `admin@crm.com`

4. **Missing natureOfProblem**:
   - Error: "natureOfProblem is required"
   - Fix: Provide description in `natureOfProblem` column

---

## 📁 File Location:

Place your DTR Excel file at:
```
backend/data/dtr_cases.xlsx
```

Then run:
```bash
npm run import:bulk
```

---

## ✅ Quick Checklist:

- [ ] `caseNumber` column present
- [ ] `errorDate` column present (YYYY-MM-DD format)
- [ ] `serialNumber` or `unitSerial` column present
- [ ] `natureOfProblem` column present (not empty)
- [ ] `callStatus` column present (valid value: open, in_progress, closed, escalated)
- [ ] `caseSeverity` column present (valid value: low, medium, high, critical)
- [ ] `createdBy` column present (valid user email)
- [ ] File saved as `dtr_cases.xlsx` in `backend/data/` folder

