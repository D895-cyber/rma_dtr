# 🔧 Parts Management System - Complete Guide

## 📊 Overview

The Parts Management System allows you to:
- Define parts for each projector model
- Auto-populate part details in RMA forms
- Maintain a catalog of replacement parts
- Track which parts belong to which projector models

---

## 🎯 **The Problem It Solves**

### **Before (Manual Entry - Error Prone):**
```
Creating RMA:
1. User selects Audi
2. User manually types: "Projector Lamp"
3. User manually types: "ELPLP88"
4. User makes typo: "ELPL88" ❌
5. Inconsistent data in database
```

### **After (Auto-Select - Accurate):**
```
Creating RMA:
1. User selects Audi → System gets Projector Model (Epson EB-L1500U)
2. User clicks "Select Defective Part"
3. System shows dropdown:
   • Projector Lamp (ELPLP88)
   • Air Filter (ELPAF32)
   • DMD Chip (DMD-CHIP-001)
4. User selects from list → Auto-fills part name & number ✅
5. Consistent, accurate data
```

---

## 🛠️ **How It Works**

### **Data Structure:**

```
Projector: Epson EB-L1500U
├─ Part 1: Projector Lamp (ELPLP88) - Category: Lamp
├─ Part 2: Air Filter (ELPAF32) - Category: Filter
└─ Part 3: DMD Chip (DMD-CHIP-001) - Category: Board

Projector: NEC-NC1200C
├─ Part 1: Xenon Lamp (NP26LP) - Category: Lamp
├─ Part 2: Color Wheel (CW-001) - Category: Wheel
└─ Part 3: DMD Board (DMD-NEC-001) - Category: Board
```

### **Relationships:**

```
Projector (modelNo)
    ↓ One-to-Many
   Part (projectorModelNo)
```

---

## 📋 **API Endpoints**

### **Base URL:** `http://localhost:5001/api/parts`

### **1. Get All Parts**
```http
GET /api/parts
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "parts": [
      {
        "id": "uuid",
        "partName": "Projector Lamp",
        "partNumber": "ELPLP88",
        "projectorModelNo": "Epson EB-L1500U",
        "category": "Lamp",
        "description": "Replacement lamp",
        "projector": {
          "id": "uuid",
          "modelNo": "Epson EB-L1500U"
        }
      }
    ],
    "total": 10
  }
}
```

---

### **2. Get Parts by Projector Model** ⭐ **Most Used**
```http
GET /api/parts/projector/{modelNo}
Authorization: Bearer {token}
```

**Example:**
```bash
GET /api/parts/projector/Epson%20EB-L1500U
```

**Response:**
```json
{
  "success": true,
  "data": {
    "parts": [
      {
        "partName": "Projector Lamp",
        "partNumber": "ELPLP88",
        "category": "Lamp"
      },
      {
        "partName": "Air Filter",
        "partNumber": "ELPAF32",
        "category": "Filter"
      }
    ],
    "total": 2
  }
}
```

---

### **3. Get Single Part**
```http
GET /api/parts/{id}
Authorization: Bearer {token}
```

---

### **4. Create Part** (Admin/Manager only)
```http
POST /api/parts
Authorization: Bearer {token}
Content-Type: application/json

{
  "partName": "Projector Lamp",
  "partNumber": "ELPLP88",
  "projectorModelNo": "Epson EB-L1500U",
  "category": "Lamp",
  "description": "Replacement lamp for Epson projectors"
}
```

**Required Fields:**
- ✅ `partName` - Name of the part
- ✅ `partNumber` - Part/SKU number (unique per projector model)
- ✅ `projectorModelNo` - Must exist in projectors table

**Optional Fields:**
- ⭕ `category` - e.g., "Lamp", "Filter", "Board", "Lens"
- ⭕ `description` - Additional details

**Validation:**
- `projectorModelNo` must reference an existing projector
- `partNumber` + `projectorModelNo` combination must be unique

---

### **5. Update Part** (Admin/Manager only)
```http
PUT /api/parts/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "partName": "Updated Name",
  "category": "Lamp"
}
```

---

### **6. Delete Part** (Admin only)
```http
DELETE /api/parts/{id}
Authorization: Bearer {token}
```

---

### **7. Get Part Categories**
```http
GET /api/parts/categories
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["Lamp", "Filter", "Board", "Lens", "Wheel"]
  }
}
```

---

## 🎬 **Integration with RMA Flow**

### **Step 1: User Selects Audi**

```typescript
// Frontend - RMAForm.tsx
const handleAudiChange = async (audiId: string) => {
  // Fetch Audi details (includes projector)
  const response = await fetch(`/api/master-data/audis/${audiId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  const projectorModelNo = data.audi.projector.modelNo;
  
  // Fetch parts for this projector model
  const partsResponse = await fetch(
    `/api/parts/projector/${encodeURIComponent(projectorModelNo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const { data: partsData } = await partsResponse.json();
  setAvailableParts(partsData.parts);
};
```

### **Step 2: Show Parts Dropdown**

```tsx
<div>
  <label>Select Defective Part</label>
  <select onChange={(e) => handlePartSelection(e.target.value)}>
    <option value="">-- Select Part --</option>
    {availableParts.map(part => (
      <option key={part.id} value={part.id}>
        {part.partName} ({part.partNumber})
        {part.category && ` - ${part.category}`}
      </option>
    ))}
  </select>
</div>
```

### **Step 3: Auto-fill RMA Form**

```typescript
const handlePartSelection = (partId: string) => {
  const selectedPart = availableParts.find(p => p.id === partId);
  
  if (selectedPart) {
    setFormData({
      ...formData,
      productName: selectedPart.partName,
      productPartNumber: selectedPart.partNumber,
    });
  }
};
```

---

## 🧪 **Testing the Parts API**

### **1. Create Sample Parts for Epson EB-L1500U**

```bash
TOKEN="your-token-here"

# Lamp
curl -X POST http://localhost:5001/api/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partName": "Projector Lamp",
    "partNumber": "ELPLP88",
    "projectorModelNo": "Epson EB-L1500U",
    "category": "Lamp"
  }'

# Air Filter
curl -X POST http://localhost:5001/api/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partName": "Air Filter",
    "partNumber": "ELPAF32",
    "projectorModelNo": "Epson EB-L1500U",
    "category": "Filter"
  }'

# DMD Chip
curl -X POST http://localhost:5001/api/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partName": "DMD Chip",
    "partNumber": "DMD-CHIP-001",
    "projectorModelNo": "Epson EB-L1500U",
    "category": "Board"
  }'
```

### **2. Fetch Parts for Projector**

```bash
curl -X GET "http://localhost:5001/api/parts/projector/Epson%20EB-L1500U" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Output:**
```json
{
  "parts": [
    {
      "partName": "Projector Lamp",
      "partNumber": "ELPLP88",
      "category": "Lamp"
    },
    {
      "partName": "Air Filter",
      "partNumber": "ELPAF32",
      "category": "Filter"
    },
    {
      "partName": "DMD Chip",
      "partNumber": "DMD-CHIP-001",
      "category": "Board"
    }
  ],
  "total": 3
}
```

---

## 📊 **Common Part Categories**

| Category | Examples | Use Case |
|----------|----------|----------|
| **Lamp** | ELPLP88, NP26LP | Projector bulbs |
| **Filter** | ELPAF32, V13H134A52 | Air filters |
| **Board** | DMD Chip, Main Board | Electronic boards |
| **Lens** | ELPLM08, ELPLW05 | Projection lenses |
| **Wheel** | Color Wheel | Color wheels |
| **Cable** | HDMI Cable, VGA Cable | Cables & connectors |
| **Remote** | EB-RC01, EB-RC02 | Remote controls |

---

## 💡 **Best Practices**

### **1. Consistent Naming**
```
✅ Good: "Projector Lamp", "Air Filter Unit"
❌ Bad: "lamp", "filter", "LAMP"
```

### **2. Standard Part Numbers**
```
✅ Good: "ELPLP88", "NP26LP"
❌ Bad: "Lamp 88", "lamp-88"
```

### **3. Use Categories**
Always set a category for better filtering and organization.

### **4. Add Descriptions**
Provide helpful descriptions for uncommon parts.

### **5. Validate Projector Models**
Ensure the projector model exists before creating parts.

---

## 🔄 **Complete RMA Flow with Parts**

```
1. User creates RMA
   ↓
2. Select Audi
   ↓
3. System gets Projector Model from Audi
   GET /api/master-data/audis/{audiId}
   → Returns: projector.modelNo
   ↓
4. System fetches parts for that model
   GET /api/parts/projector/{modelNo}
   → Returns: List of parts
   ↓
5. User selects part from dropdown
   ↓
6. System auto-fills:
   - productName = part.partName
   - productPartNumber = part.partNumber
   ↓
7. User fills remaining fields (symptoms, etc.)
   ↓
8. Submit RMA
   POST /api/rma
   ✅ Success!
```

---

## 🐛 **Common Errors & Solutions**

### **❌ "Projector model not found"**
**Cause:** The `projectorModelNo` doesn't exist in the database  
**Fix:** Create the projector first, then create parts for it

### **❌ "Part with this part number already exists"**
**Cause:** Duplicate `partNumber` for the same `projectorModelNo`  
**Fix:** Use a different part number or update the existing part

### **❌ "Failed to fetch parts"**
**Cause:** Invalid model number or URL encoding issue  
**Fix:** URL-encode the model number: `Epson EB-L1500U` → `Epson%20EB-L1500U`

---

## ✅ **Summary**

**What you get:**
- ✅ Organized parts catalog per projector model
- ✅ Dropdown selection in RMA forms (no manual typing!)
- ✅ Consistent part names and numbers
- ✅ Easy maintenance and updates
- ✅ Better data quality

**Key Endpoint:**
```
GET /api/parts/projector/{modelNo}
```

**Next Steps:**
1. Add parts for each projector model in your database
2. Update frontend RMA form to use the Parts API
3. Implement dropdown selection
4. Test the complete flow

---

**Need help?** Check:
- `API.md` - Full API documentation
- `API_FIELDS_REFERENCE.md` - Field names reference
- `CREATE_DTR_GUIDE.md` - DTR/RMA creation guide




