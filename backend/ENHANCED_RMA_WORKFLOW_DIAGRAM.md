# 📊 Enhanced RMA Workflow - Visual Diagram

## 🔄 Complete Workflow with Branching Paths

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: INITIAL SUBMISSION                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. OPEN
   │
   │ [Submit RMA Form]
   ↓
2. RMA_FORM_SUBMITTED
   │
   │ [Manager/Admin Reviews]
   ↓
3. RMA_APPROVED
   │
   │ [Order Replacement Part]
   ↓
4. RMA_RAISED_YET_TO_DELIVER
   │
   │ [Replacement Part Ordered]
   │
   ┌─────────────────────────────────────────────────────────┐
   │              DECISION POINT: Delivery Path                │
   └─────────────────────────────────────────────────────────┘
   │
   ├──────────────────────────────────────────────────────────┐
   │                                                           │
   │ PATH A: Part Comes to Ascomp First                          │
   │                                                           │
   ↓                                                           │
5. REPLACEMENT_PART_RECEIVED_AT_CDS                           │
   │                                                           │
   │ [Inspect & Verify]                                       │
   ↓                                                           │
6. REPLACEMENT_PART_SHIPPED_TO_SITE                          │
   │                                                           │
   └──────────────────────────────────────────────────────────┘
   │
   ┌──────────────────────────────────────────────────────────┐
   │                                                           │
   │ PATH B: Direct Shipment to Site                          │
   │                                                           │
   ↓                                                           │
6. REPLACEMENT_PART_SHIPPED_DIRECTLY_TO_SITE                 │
   │                                                           │
   └──────────────────────────────────────────────────────────┘
   │
   │ [Both paths converge here]
   ↓
7. REPLACEMENT_PART_INSTALLED_AT_SITE
   │
   │ [Site Technician Confirms]
   │
   ┌─────────────────────────────────────────────────────────────┐
   │              PHASE 2: DEFECTIVE PART COLLECTION             │
   └─────────────────────────────────────────────────────────────┘
   │
   ↓
8. DEFECTIVE_PART_PACKAGING_IN_PROGRESS
   │
   │ [Package Part]
   │ [Upload Video if Required]
   │ [Take Photos]
   │ [Complete Checklist]
   │
   ┌─────────────────────────────────────────────────────────┐
   │         DECISION POINT: Defective Part Return Path        │
   └─────────────────────────────────────────────────────────┘
   │
   ├──────────────────────────────────────────────────────────┐
   │                                                           │
   │ PATH A: Direct Shipment to CDS                           │
   │                                                           │
   ↓                                                           │
9. DEFECTIVE_PART_SHIPPED_TO_CDS                              │
   │                                                           │
   │ [Track Shipment]                                         │
   ↓                                                           │
10. DEFECTIVE_PART_RECEIVED_AT_CDS                           │
   │                                                           │
   │ [Inspect Packaging]                                      │
   │                                                           │
   ├───────────────────────────────────────────────────────────┤
   │                                                           │
   │ If Repackaging Needed:                                   │
   ↓                                                           │
11. DEFECTIVE_PART_REPACKAGED_AT_CDS                         │
   │                                                           │
   │ [Create New Packaging Video]                             │
   │ [Update Documentation]                                    │
   │                                                           │
   └───────────────────────────────────────────────────────────┘
   │
   │ [Both paths converge here]
   ↓
12. DEFECTIVE_PART_SHIPPED_TO_OEM
   │
   │ [Track to OEM]
   │ [Record OEM Case Number]
   │
   ┌─────────────────────────────────────────────────────────────┐
   │              PHASE 3: OEM RESPONSE & CLOSURE                  │
   └─────────────────────────────────────────────────────────────┘
   │
   ↓
13. OEM_RESPONSE_PENDING
   │
   │ [Wait for OEM Response]
   │
   ├──────────────────────┬──────────────────────┐
   │                      │                      │
   ↓                      ↓                      ↓
14. OEM_CREDIT_RECEIVED  14. OEM_REJECTED       [Timeout]
   │                      │                      │
   │                      │                      │
   ↓                      ↓                      ↓
15. CLOSED               15. CLOSED             15. CLOSED
   │                      │                      │
   └──────────────────────┴──────────────────────┘
```

---

## 🎯 Key Decision Points

### **Decision Point 1: Replacement Part Delivery**

**Question**: Does the replacement part come to CDS first, or ship directly to site?

**If Part Comes to CDS First:**
```
rma_raised_yet_to_deliver
  → replacement_part_received_at_cds
  → replacement_part_shipped_to_site
  → replacement_part_installed_at_site
```

**If Direct Shipment to Site:**
```
rma_raised_yet_to_deliver
  → replacement_part_shipped_directly_to_site
  → replacement_part_installed_at_site
```

**Field**: `isDirectShipmentToSite` (Boolean)

---

### **Decision Point 2: Defective Part Return Path**

**Question**: Does the defective part go directly to CDS, or does it need repackaging at CDS?

**If Direct Shipment to CDS:**
```
defective_part_packaging_in_progress
  → defective_part_shipped_to_cds
  → defective_part_received_at_cds
  → defective_part_shipped_to_oem
```

**If Repackaging Needed at CDS:**
```
defective_part_packaging_in_progress
  → defective_part_received_at_cds
  → defective_part_repackaged_at_cds
  → defective_part_shipped_to_oem
```

**Field**: `defectivePartReturnPath` (Enum: `direct_to_cds` | `via_cds_repackaging`)

---

### **Decision Point 3: Packaging Video Requirement**

**Question**: Does this part type require a packaging video?

**If Video Required:**
- Must upload `packagingVideoUrl` before moving to next status
- System enforces validation

**If Video Not Required:**
- Video optional
- Can proceed without video

**Field**: `requiresPackagingVideo` (Boolean)
**Source**: Part type configuration or RMA type configuration

---

## 📋 Status Summary Table

| Phase | Status | Description | Required Fields |
|-------|--------|-------------|----------------|
| **1** | `open` | Case open, observation ongoing | - |
| **1** | `rma_form_submitted` | Form submitted, awaiting approval | All form fields |
| **1** | `rma_approved` | Approved by manager/admin | `rmaApprovedBy`, `rmaApprovedDate` |
| **1** | `rma_raised_yet_to_deliver` | Replacement part ordered | `replacementPartOrderDate` |
| **2** | `replacement_part_received_at_cds` | Part received at CDS | `replacementPartReceivedAtCdsDate`, `replacementPartReceivedBy` |
| **2** | `replacement_part_shipped_to_site` | Shipped from CDS to site | `replacementPartCarrier`, `replacementPartTrackingNumber` |
| **2** | `replacement_part_shipped_directly_to_site` | Direct shipment to site | `replacementPartCarrier`, `replacementPartTrackingNumber` |
| **2** | `replacement_part_installed_at_site` | Installed at site | `replacementPartInstalledDate`, `replacementPartInstalledBy` |
| **3** | `defective_part_packaging_in_progress` | Packaging defective part | `defectivePartPackagingDate`, `defectivePartPackagedBy` |
| **4** | `defective_part_shipped_to_cds` | Shipped from site to CDS | `returnTrackingNumber`, `returnShippedDate` |
| **4** | `defective_part_received_at_cds` | Received at CDS | `defectivePartReceivedAtCdsDate`, `defectivePartReceivedBy` |
| **4** | `defective_part_repackaged_at_cds` | Repackaged at CDS | `defectivePartRepackagedAtCdsDate`, `defectivePartRepackagedBy` |
| **4** | `defective_part_shipped_to_oem` | Shipped to OEM | `defectivePartOemCaseNumber`, `defectivePartOemTrackingNumber` |
| **5** | `oem_response_pending` | Waiting for OEM response | - |
| **5** | `oem_credit_received` | OEM credit received | `oemCreditReceivedDate`, `oemCreditAmount` |
| **5** | `oem_rejected` | OEM rejected RMA | `oemRejectedDate`, `oemRejectionReason` |
| **5** | `closed` | RMA completed | - |
| **5** | `cancelled` | RMA cancelled | - |

---

## 🔀 Workflow Paths Visualization

### **Complete Path A: Standard Flow (Part to CDS First)**
```
open
  → rma_form_submitted
  → rma_approved
  → rma_raised_yet_to_deliver
  → replacement_part_received_at_cds
  → replacement_part_shipped_to_site
  → replacement_part_installed_at_site
  → defective_part_packaging_in_progress
  → defective_part_shipped_to_cds
  → defective_part_received_at_cds
  → defective_part_shipped_to_oem
  → oem_response_pending
  → oem_credit_received
  → closed
```

### **Complete Path B: Direct Shipment Flow**
```
open
  → rma_form_submitted
  → rma_approved
  → rma_raised_yet_to_deliver
  → replacement_part_shipped_directly_to_site
  → replacement_part_installed_at_site
  → defective_part_packaging_in_progress
  → defective_part_shipped_to_cds
  → defective_part_received_at_cds
  → defective_part_shipped_to_oem
  → oem_response_pending
  → oem_credit_received
  → closed
```

### **Complete Path C: With Repackaging**
```
open
  → rma_form_submitted
  → rma_approved
  → rma_raised_yet_to_deliver
  → replacement_part_received_at_cds
  → replacement_part_shipped_to_site
  → replacement_part_installed_at_site
  → defective_part_packaging_in_progress
  → defective_part_received_at_cds
  → defective_part_repackaged_at_cds
  → defective_part_shipped_to_oem
  → oem_response_pending
  → oem_credit_received
  → closed
```

---

## ⚠️ Validation Rules

### **Status Transition Validation**

1. **Cannot skip statuses** - Must follow valid transitions
2. **Required fields must be filled** - Before moving to next status
3. **Video required if part type requires it** - Cannot proceed without video
4. **Approval required** - Only managers/admins can approve
5. **Installation confirmation** - Site must confirm installation

### **Field Validation**

- **Dates**: Must be valid dates, cannot be in future (except for scheduled dates)
- **Tracking Numbers**: Must be unique per shipment
- **Video URLs**: Must be valid URLs, accessible
- **Photos**: Must be valid image files
- **Amounts**: Must be positive numbers

---

## 📊 Status Color Coding

| Status | Color | Meaning |
|--------|-------|---------|
| `open` | 🔵 Blue | Initial state |
| `rma_form_submitted` | 🟡 Yellow | Awaiting action |
| `rma_approved` | 🟢 Green | Approved |
| `rma_raised_yet_to_deliver` | 🟡 Yellow | In progress |
| `replacement_part_*` | 🟡 Yellow | Replacement in progress |
| `replacement_part_installed_at_site` | 🟢 Green | Completed step |
| `defective_part_packaging_in_progress` | 🟠 Orange | Packaging required |
| `defective_part_repackaged_at_cds` | 🟠 Orange | Repackaging |
| `defective_part_shipped_to_oem` | 🟣 Purple | With OEM |
| `oem_response_pending` | 🟣 Purple | Waiting for OEM |
| `oem_credit_received` | 🟢 Green | Success |
| `oem_rejected` | 🔴 Red | Rejected |
| `closed` | ⚫ Gray | Completed |
| `cancelled` | 🔴 Red | Cancelled |

---

## 🔔 Notification Flow

```
Status Change → Check Notification Rules → Send Notifications
```

**Notification Types:**
- 📧 Email
- 🔔 In-app notification
- 📱 SMS (for critical statuses)
- 💬 Slack/Teams (optional)

**Recipients:**
- Assigned engineer
- Case creator
- Manager/Admin
- Site contact (for installation status)
- Finance team (for OEM credit)





