# 📋 RMA Status Reference - Quick Copy & Paste

## ✅ **Updated RMA Status Values**

Use these **EXACT** values when creating or updating RMA cases:

---

## 🎯 **Status Values (Copy These)**

### 1. Open
```json
{
  "status": "open"
}
```
**Meaning:** Case is open, observation is going on  
**When:** Initial case creation, diagnosis phase

---

### 2. RMA Raised - Yet to Deliver
```json
{
  "status": "rma_raised_yet_to_deliver"
}
```
**Meaning:** RMA raised but replacement part yet to deliver to site  
**When:** RMA approved, waiting for replacement part

---

### 3. Faulty in Transit to CDS
```json
{
  "status": "faulty_in_transit_to_cds"
}
```
**Meaning:** Defective part in transit back to us from site  
**When:** Defective part being shipped back

---

### 4. Closed
```json
{
  "status": "closed"
}
```
**Meaning:** RMA completed, defective part shipped back to OEM  
**When:** Case complete, defective part sent to manufacturer

---

### 5. Cancelled
```json
{
  "status": "cancelled"
}
```
**Meaning:** RMA cancelled  
**When:** RMA request denied or cancelled

---

## 📝 **Complete RMA Creation Example**

```json
POST /api/rma
Authorization: Bearer {token}

{
  "rmaType": "RMA",
  "rmaNumber": "RMA-2024-001",
  "rmaOrderNumber": "ORD-2024-001",
  "rmaRaisedDate": "2024-12-08",
  "customerErrorDate": "2024-12-07",
  "siteId": "site-uuid-here",
  "audiId": "audi-uuid-here",
  "productName": "Projector Lamp",
  "productPartNumber": "ELPLP88",
  "serialNumber": "LAMP-001",
  "defectDetails": "Lamp burnt out after 2000 hours",
  "symptoms": "No display, lamp error indicator on",
  "status": "open"
}
```

---

## 🔄 **Status Update Examples**

### Update to "RMA Raised - Yet to Deliver"
```bash
PUT /api/rma/{rmaId}

{
  "status": "rma_raised_yet_to_deliver",
  "replacedPartNumber": "ELPLP88-NEW",
  "replacedPartSerial": "NEW-LAMP-789",
  "notes": "Replacement part ordered from supplier"
}
```

### Update to "Faulty in Transit to CDS"
```bash
PUT /api/rma/{rmaId}

{
  "status": "faulty_in_transit_to_cds",
  "returnTrackingNumber": "DHL-123456789",
  "returnShippedThrough": "DHL Express",
  "returnShippedDate": "2024-12-08",
  "notes": "Defective part shipped back via DHL"
}
```

### Update to "Closed"
```bash
PUT /api/rma/{rmaId}

{
  "status": "closed",
  "notes": "Defective part received at warehouse. Shipped to OEM via FedEx. Case closed."
}
```

---

## 📊 **Frontend Dropdown Values**

For your RMA form dropdown in React:

```typescript
const rmaStatuses = [
  { value: 'open', label: 'Open', description: 'Observation is going on' },
  { value: 'rma_raised_yet_to_deliver', label: 'RMA Raised - Yet to Deliver', description: 'Waiting for replacement' },
  { value: 'faulty_in_transit_to_cds', label: 'Faulty in Transit to CDS', description: 'Defective part in transit' },
  { value: 'closed', label: 'Closed', description: 'Completed' },
  { value: 'cancelled', label: 'Cancelled', description: 'RMA cancelled' },
];
```

**Dropdown:**
```tsx
<select value={status} onChange={(e) => setStatus(e.target.value)}>
  <option value="open">Open</option>
  <option value="rma_raised_yet_to_deliver">RMA Raised - Yet to Deliver</option>
  <option value="faulty_in_transit_to_cds">Faulty in Transit to CDS</option>
  <option value="closed">Closed</option>
  <option value="cancelled">Cancelled</option>
</select>
```

---

## 🎯 **Status Colors for UI**

```typescript
const statusColors = {
  open: 'bg-blue-100 text-blue-800',                        // Blue
  rma_raised_yet_to_deliver: 'bg-yellow-100 text-yellow-800', // Yellow
  faulty_in_transit_to_cds: 'bg-purple-100 text-purple-800',  // Purple
  closed: 'bg-green-100 text-green-800',                     // Green
  cancelled: 'bg-red-100 text-red-800',                      // Red
};
```

---

## ⚠️ **Important Notes**

### Status Value Format
- ✅ Use `rma_raised_yet_to_deliver` (with underscores)
- ❌ NOT `rma-raised-yet-to-deliver` (with hyphens)
- ❌ NOT `RMA Raised Yet to Deliver` (with spaces)

The database stores with hyphens internally, but the API uses underscores!

### Case Sensitivity
- ✅ All lowercase: `open`, `closed`
- ❌ NOT capitalized: `Open`, `Closed`

---

## 🔍 **Filtering by Status**

```bash
# Get all open RMA cases
GET /api/rma?status=open

# Get all cases in transit
GET /api/rma?status=faulty_in_transit_to_cds

# Get closed cases
GET /api/rma?status=closed
```

---

## 📊 **Status Statistics**

```bash
# Get RMA breakdown by status
GET /api/analytics/dashboard

Response includes:
{
  "rma": {
    "total": 10,
    "open": 3,
    "rma_raised_yet_to_deliver": 2,
    "faulty_in_transit_to_cds": 1,
    "closed": 4
  }
}
```

---

## ✅ **Summary**

**RMA Statuses Updated:**
- ✅ Database enum updated
- ✅ All existing data migrated
- ✅ API using new values
- ✅ Documentation complete

**Use these exact values:**
1. `open`
2. `rma_raised_yet_to_deliver`
3. `faulty_in_transit_to_cds`
4. `closed`
5. `cancelled`

**Your RMA workflow now matches your business process! 🎉**




