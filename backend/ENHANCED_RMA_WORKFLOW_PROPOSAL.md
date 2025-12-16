# 🚀 Enhanced RMA Workflow Proposal

## 📋 Overview

This document outlines the enhanced RMA workflow with granular status tracking, branching paths, and packaging/documentation requirements.

---

## 🔄 **Complete Enhanced RMA Status Flow**

### **Phase 1: Initial Submission & Approval**

```
1. OPEN
   ├─ Description: Case is open, observation is going on
   ├─ Actions: Diagnosis, troubleshooting
   └─ Next: Submit RMA form
           ↓
2. RMA_FORM_SUBMITTED
   ├─ Description: RMA form has been submitted, awaiting approval
   ├─ Actions: Manager/Admin reviews and approves
   ├─ Required: All form fields completed
   └─ Next: Approval decision
           ↓
3. RMA_APPROVED
   ├─ Description: RMA has been approved by manager/admin
   ├─ Actions: Order replacement part
   ├─ Required: Approval timestamp, approver name
   └─ Next: Order replacement part
           ↓
4. RMA_RAISED_YET_TO_DELIVER
   ├─ Description: Replacement part ordered, waiting for delivery
   ├─ Actions: Track replacement part order
   └─ Next: Replacement part arrives (two paths)
```

### **Phase 2: Replacement Part Delivery (Branching Path)**

```
Path A: Replacement Part Comes to Ascomp First
   ↓
5. REPLACEMENT_PART_RECEIVED_AT_Ascomp
   ├─ Description: Replacement part received at Ascomp warehouse
   ├─ Actions: Inspect, verify, prepare for shipment
   ├─ Required: Receipt date, received by, inspection notes
   └─ Next: Ship to site
           ↓
6. REPLACEMENT_PART_SHIPPED_TO_SITE
   ├─ Description: Replacement part shipped from Ascomp to site
   ├─ Actions: Track shipment
   ├─ Required: Shipping carrier, tracking number, shipped date


Path B: Direct Shipment to Site (Bypass Ascomp)
   ↓
6. REPLACEMENT_PART_SHIPPED_DIRECTLY_TO_SITE
   ├─ Description: Replacement part shipped directly from supplier to site
   ├─ Actions: Track direct shipment
   ├─ Required: Shipping carrier, tracking number, shipped date
   └─ Next: Installation at site
```

### **Phase 3: Installation & Defective Part Collection**

```
7. REPLACEMENT_PART_INSTALLED_AT_SITE
   ├─ Description: Replacement part installed at site
   ├─ Actions: Site technician confirms installation
   ├─ Required: Installation date, installed by, installation notes
   └─ Next: Collect defective part
           ↓
8. DEFECTIVE_PART_PACKAGING_IN_PROGRESS
   ├─ Description: Defective part being packaged for return
   ├─ Actions: Package part, create packaging video (if required)
   ├─ Required: 
   │   - Packaging date
   │   - Packaging video URL (if required for part type)
   │   - Packaging checklist completed
   │   - Packaging photos
   └─ Next: Ship defective part (two paths)
```

### **Phase 4: Defective Part Return (Branching Path)**

```
Path A: Direct Shipment to CDS
   ↓
9. DEFECTIVE_PART_SHIPPED_TO_CDS
   ├─ Description: Defective part shipped directly from site to CDS
   ├─ Actions: Track shipment
   ├─ Required: Shipping carrier, tracking number, shipped date
   └─ Next: Receive at CDS
           ↓
10. DEFECTIVE_PART_RECEIVED_AT_CDS
    ├─ Description: Defective part received at CDS
    ├─ Actions: Inspect, verify packaging, prepare for OEM
    ├─ Required: Receipt date, received by, inspection notes
    └─ Next: Ship to OEM
            ↓
11. DEFECTIVE_PART_SHIPPED_TO_OEM
    ├─ Description: Defective part shipped to OEM
    ├─ Actions: Track shipment to OEM
    ├─ Required: Shipping carrier, tracking number, shipped date, OEM case number
    └─ Next: Wait for OEM response

Path B: Part Comes to CDS First, Then Sent to CDS (Double Handling)
   ↓
9. DEFECTIVE_PART_RECEIVED_AT_CDS_FROM_SITE
   ├─ Description: Defective part received at CDS from site
   ├─ Actions: Inspect, repackage if needed
   ├─ Required: Receipt date, received by, inspection notes
   └─ Next: Repackage and send to CDS (if needed) or OEM
           ↓
10. DEFECTIVE_PART_REPACKAGED_AT_CDS
    ├─ Description: Part repackaged at CDS (if original packaging insufficient)
    ├─ Actions: Create new packaging video, update documentation
    ├─ Required: Repackaging date, repackaging video, new tracking
    └─ Next: Ship to OEM
            ↓
11. DEFECTIVE_PART_SHIPPED_TO_OEM
    ├─ Description: Defective part shipped to OEM
    ├─ Actions: Track shipment to OEM
    ├─ Required: Shipping carrier, tracking number, shipped date, OEM case number
    └─ Next: Wait for OEM response
```

### **Phase 5: OEM Response & Closure**

```
12. OEM_RESPONSE_PENDING
    ├─ Description: Waiting for OEM response/credit
    ├─ Actions: Follow up with OEM
    └─ Next: OEM responds
            ↓
13. OEM_CREDIT_RECEIVED / OEM_REJECTED
    ├─ Description: OEM credit received or RMA rejected
    ├─ Actions: Update financial records, close case
    └─ Next: Close case
            ↓
14. CLOSED
    ├─ Description: RMA completed
    ├─ Actions: Archive case
    └─ End of lifecycle
```

---

## 📊 **New Database Fields Required**

### **Replacement Part Tracking**
```prisma
// Replacement part tracking
replacementPartOrderDate          DateTime?  @map("replacement_part_order_date") @db.Date
replacementPartOrderNumber        String?   @map("replacement_part_order_number")
replacementPartReceivedAtCdsDate  DateTime?  @map("replacement_part_received_at_cds_date") @db.Date
replacementPartReceivedBy         String?   @map("replacement_part_received_by")
replacementPartInspectionNotes    String?   @map("replacement_part_inspection_notes") @db.Text
replacementPartShippedToSiteDate  DateTime?  @map("replacement_part_shipped_to_site_date") @db.Date
replacementPartCarrier            String?   @map("replacement_part_carrier")
replacementPartTrackingNumber     String?   @map("replacement_part_tracking_number")
replacementPartInstalledDate      DateTime?  @map("replacement_part_installed_date") @db.Date
replacementPartInstalledBy        String?   @map("replacement_part_installed_by")
replacementPartInstallationNotes  String?   @map("replacement_part_installation_notes") @db.Text
isDirectShipmentToSite            Boolean   @default(false) @map("is_direct_shipment_to_site")
```

### **Defective Part Packaging & Documentation**
```prisma
// Defective part packaging
defectivePartPackagingDate        DateTime?  @map("defective_part_packaging_date") @db.Date
defectivePartPackagedBy           String?   @map("defective_part_packaged_by")
requiresPackagingVideo            Boolean   @default(false) @map("requires_packaging_video")
packagingVideoUrl                  String?   @map("packaging_video_url")
packagingChecklistCompleted        Boolean   @default(false) @map("packaging_checklist_completed")
packagingPhotos                    String[]  @default([]) @map("packaging_photos") // Array of photo URLs
packagingNotes                     String?   @map("packaging_notes") @db.Text
```

### **Defective Part Return Tracking**
```prisma
// Defective part return tracking
defectivePartReceivedAtCdsDate    DateTime?  @map("defective_part_received_at_cds_date") @db.Date
defectivePartReceivedBy           String?   @map("defective_part_received_by")
defectivePartInspectionAtCdsNotes String?   @map("defective_part_inspection_at_cds_notes") @db.Text
defectivePartRepackagedAtCdsDate  DateTime?  @map("defective_part_repackaged_at_cds_date") @db.Date
defectivePartRepackagedBy         String?   @map("defective_part_repackaged_by")
defectivePartRepackagingVideoUrl  String?   @map("defective_part_repackaging_video_url")
defectivePartShippedToOemDate     DateTime?  @map("defective_part_shipped_to_oem_date") @db.Date
defectivePartOemCaseNumber        String?   @map("defective_part_oem_case_number")
defectivePartOemCarrier           String?   @map("defective_part_oem_carrier")
defectivePartOemTrackingNumber    String?   @map("defective_part_oem_tracking_number")
```

### **Approval Tracking**
```prisma
// Approval workflow
rmaFormSubmittedDate               DateTime?  @map("rma_form_submitted_date")
rmaApprovedDate                   DateTime?  @map("rma_approved_date")
rmaApprovedBy                     String?   @map("rma_approved_by")
rmaApprovalNotes                  String?   @map("rma_approval_notes") @db.Text
```

### **OEM Response Tracking**
```prisma
// OEM response
oemResponsePendingDate            DateTime?  @map("oem_response_pending_date")
oemCreditReceivedDate             DateTime?  @map("oem_credit_received_date")
oemCreditAmount                   Decimal?   @map("oem_credit_amount") @db.Decimal(10, 2)
oemRejectedDate                   DateTime?  @map("oem_rejected_date")
oemRejectionReason                String?   @map("oem_rejection_reason") @db.Text
```

---

## 🎯 **Updated RMA Status Enum**

```prisma
enum RmaStatus {
  // Phase 1: Initial Submission & Approval
  open                          // Case is open, observation is going on
  rma_form_submitted           @map("rma-form-submitted")  // RMA form submitted, awaiting approval
  rma_approved                 @map("rma-approved")  // RMA approved by manager/admin
  rma_raised_yet_to_deliver    @map("rma-raised-yet-to-deliver")  // Replacement part ordered
  
  // Phase 2: Replacement Part Delivery
  replacement_part_received_at_cds        @map("replacement-part-received-at-cds")  // Part received at CDS
  replacement_part_shipped_to_site        @map("replacement-part-shipped-to-site")  // Part shipped from CDS to site
  replacement_part_shipped_directly_to_site @map("replacement-part-shipped-directly-to-site")  // Direct shipment bypassing CDS
  replacement_part_installed_at_site      @map("replacement-part-installed-at-site")  // Part installed at site
  
  // Phase 3: Defective Part Collection
  defective_part_packaging_in_progress    @map("defective-part-packaging-in-progress")  // Packaging defective part
  
  // Phase 4: Defective Part Return
  defective_part_shipped_to_cds          @map("defective-part-shipped-to-cds")  // Shipped from site to CDS
  defective_part_received_at_cds         @map("defective-part-received-at-cds")  // Received at CDS from site
  defective_part_repackaged_at_cds       @map("defective-part-repackaged-at-cds")  // Repackaged at CDS
  defective_part_shipped_to_oem          @map("defective-part-shipped-to-oem")  // Shipped to OEM
  faulty_in_transit_to_cds              @map("faulty-in-transit-to-cds")  // Legacy status (keep for backward compatibility)
  
  // Phase 5: OEM Response & Closure
  oem_response_pending                   @map("oem-response-pending")  // Waiting for OEM response
  oem_credit_received                   @map("oem-credit-received")  // OEM credit received
  oem_rejected                          @map("oem-rejected")  // OEM rejected RMA
  closed                                // RMA completed
  cancelled                             // RMA cancelled
}
```

---

## 🔀 **Workflow Branching Logic**

### **Decision Point 1: Replacement Part Delivery Path**

**Field**: `isDirectShipmentToSite` (Boolean)

- **If `false`**: 
  - Status flow: `rma_raised_yet_to_deliver` → `replacement_part_received_at_cds` → `replacement_part_shipped_to_site`
  
- **If `true`**: 
  - Status flow: `rma_raised_yet_to_deliver` → `replacement_part_shipped_directly_to_site`

### **Decision Point 2: Defective Part Return Path**

**Field**: `defectivePartReturnPath` (Enum: `direct_to_cds` | `via_cds_repackaging`)

- **If `direct_to_cds`**: 
  - Status flow: `defective_part_packaging_in_progress` → `defective_part_shipped_to_cds` → `defective_part_received_at_cds` → `defective_part_shipped_to_oem`
  
- **If `via_cds_repackaging`**: 
  - Status flow: `defective_part_packaging_in_progress` → `defective_part_received_at_cds_from_site` → `defective_part_repackaged_at_cds` → `defective_part_shipped_to_oem`

### **Decision Point 3: Packaging Video Requirement**

**Field**: `requiresPackagingVideo` (Boolean)

- **If `true`**: 
  - Must upload packaging video before moving to next status
  - System enforces: `packagingVideoUrl` must be provided
  
- **If `false`**: 
  - Packaging video optional
  - Can proceed without video

---

## 📋 **Status Transition Rules**

### **Valid Transitions**

```
open → rma_form_submitted
rma_form_submitted → rma_approved (requires approver)
rma_form_submitted → open (if rejected)
rma_approved → rma_raised_yet_to_deliver
rma_raised_yet_to_deliver → replacement_part_received_at_cds (if !isDirectShipmentToSite)
rma_raised_yet_to_deliver → replacement_part_shipped_directly_to_site (if isDirectShipmentToSite)
replacement_part_received_at_cds → replacement_part_shipped_to_site
replacement_part_shipped_to_site → replacement_part_installed_at_site
replacement_part_shipped_directly_to_site → replacement_part_installed_at_site
replacement_part_installed_at_site → defective_part_packaging_in_progress
defective_part_packaging_in_progress → defective_part_shipped_to_cds (if direct_to_cds)
defective_part_packaging_in_progress → defective_part_received_at_cds (if via_cds_repackaging)
defective_part_shipped_to_cds → defective_part_received_at_cds
defective_part_received_at_cds → defective_part_shipped_to_oem (if no repackaging needed)
defective_part_received_at_cds → defective_part_repackaged_at_cds (if repackaging needed)
defective_part_repackaged_at_cds → defective_part_shipped_to_oem
defective_part_shipped_to_oem → oem_response_pending
oem_response_pending → oem_credit_received
oem_response_pending → oem_rejected
oem_credit_received → closed
oem_rejected → closed (or back to open for resubmission)
```

---

## 🎨 **UI/UX Considerations**

### **Status Badge Colors**

- **Blue**: Initial states (open, rma_form_submitted, rma_approved)
- **Yellow**: In-progress states (rma_raised_yet_to_deliver, replacement_part_*)
- **Green**: Completed states (replacement_part_installed_at_site, closed)
- **Orange**: Packaging/processing states (defective_part_packaging_in_progress, defective_part_repackaged_at_cds)
- **Purple**: OEM-related states (oem_response_pending, oem_credit_received)
- **Red**: Rejected/cancelled states (oem_rejected, cancelled)

### **Required Fields Per Status**

- **rma_form_submitted**: All form fields
- **rma_approved**: `rmaApprovedBy`, `rmaApprovedDate`
- **replacement_part_received_at_cds**: `replacementPartReceivedAtCdsDate`, `replacementPartReceivedBy`
- **replacement_part_shipped_to_site**: `replacementPartCarrier`, `replacementPartTrackingNumber`, `replacementPartShippedToSiteDate`
- **replacement_part_installed_at_site**: `replacementPartInstalledDate`, `replacementPartInstalledBy`
- **defective_part_packaging_in_progress**: `defectivePartPackagingDate`, `defectivePartPackagedBy`
  - If `requiresPackagingVideo = true`: `packagingVideoUrl` required
- **defective_part_shipped_to_cds**: `returnTrackingNumber`, `returnShippedThrough`, `returnShippedDate`
- **defective_part_received_at_cds**: `defectivePartReceivedAtCdsDate`, `defectivePartReceivedBy`
- **defective_part_repackaged_at_cds**: `defectivePartRepackagedAtCdsDate`, `defectivePartRepackagedBy`, `defectivePartRepackagingVideoUrl` (if required)
- **defective_part_shipped_to_oem**: `defectivePartOemCaseNumber`, `defectivePartOemCarrier`, `defectivePartOemTrackingNumber`, `defectivePartShippedToOemDate`
- **oem_credit_received**: `oemCreditReceivedDate`, `oemCreditAmount`
- **oem_rejected**: `oemRejectedDate`, `oemRejectionReason`

---

## 📸 **File Upload Requirements**

### **Packaging Video**
- **Format**: MP4, MOV, AVI
- **Max Size**: 100MB
- **Required for**: Parts where `requiresPackagingVideo = true`
- **Storage**: Cloud storage (S3, Cloudinary, etc.)

### **Packaging Photos**
- **Format**: JPG, PNG
- **Max Size**: 10MB per photo
- **Max Count**: 10 photos
- **Required**: At least 2 photos (before and after packaging)

---

## 🔔 **Notification Triggers**

1. **rma_form_submitted**: Notify managers/admins for approval
2. **rma_approved**: Notify creator and assigned engineer
3. **replacement_part_received_at_cds**: Notify assigned engineer
4. **replacement_part_shipped_to_site**: Notify site contact
5. **replacement_part_installed_at_site**: Notify assigned engineer
6. **defective_part_packaging_in_progress**: Notify assigned engineer (if video required)
7. **defective_part_shipped_to_oem**: Notify assigned engineer and manager
8. **oem_credit_received**: Notify finance team and manager
9. **oem_rejected**: Notify assigned engineer and manager (escalation)

---

## 📊 **Analytics & Reporting**

### **New Metrics to Track**

1. **Approval Time**: Time from `rma_form_submitted` to `rma_approved`
2. **Replacement Part Lead Time**: Time from `rma_raised_yet_to_deliver` to `replacement_part_installed_at_site`
3. **Packaging Time**: Time in `defective_part_packaging_in_progress`
4. **Return Transit Time**: Time from `defective_part_shipped_to_cds` to `defective_part_received_at_cds`
5. **OEM Response Time**: Time from `defective_part_shipped_to_oem` to `oem_response_pending` to `oem_credit_received`
6. **Total RMA Cycle Time**: Time from `open` to `closed`
7. **Direct vs Indirect Shipment Ratio**: Track `isDirectShipmentToSite` usage
8. **Repackaging Rate**: Percentage of cases requiring repackaging

---

## 🚀 **Implementation Steps**

### **Phase 1: Database Schema Update**
1. Add new status enum values
2. Add new fields to `RmaCase` model
3. Create migration script
4. Update Prisma schema

### **Phase 2: Backend API Updates**
1. Update status validation logic
2. Add status transition validation
3. Update RMA controller with new fields
4. Add file upload endpoints (video, photos)
5. Update notification triggers

### **Phase 3: Frontend Updates**
1. Update status dropdown with new statuses
2. Add conditional fields based on status
3. Add file upload components (video, photos)
4. Update status transition UI
5. Add branching path selection UI
6. Update status badges and colors

### **Phase 4: Testing**
1. Test all status transitions
2. Test branching paths
3. Test file uploads
4. Test validation rules
5. Test notifications

---

## 💡 **Additional Enhancements**

### **Packaging Checklist**
Create a configurable checklist per part type:
- [ ] Part cleaned
- [ ] Original packaging used (if available)
- [ ] Protective wrapping applied
- [ ] Serial number visible
- [ ] Defect clearly documented
- [ ] Photos taken
- [ ] Video recorded (if required)
- [ ] Shipping label attached

### **Part Type Configuration**
Store part-specific requirements:
- `requiresPackagingVideo`: Boolean
- `requiresSpecialPackaging`: Boolean
- `packagingInstructions`: Text
- `estimatedPackagingTime`: Number (minutes)

### **Automated Status Updates**
- Auto-update status when tracking number shows "delivered"
- Auto-remind if status hasn't changed in X days
- Auto-escalate if OEM response pending > 30 days

---

## 📝 **Migration Strategy**

### **For Existing RMAs**
1. Map old statuses to new statuses:
   - `open` → `open` (no change)
   - `rma_raised_yet_to_deliver` → `rma_raised_yet_to_deliver` (no change)
   - `faulty_in_transit_to_cds` → `defective_part_shipped_to_cds` (or appropriate new status)
   - `closed` → `closed` (no change)
   - `cancelled` → `cancelled` (no change)

2. Set default values for new fields:
   - `isDirectShipmentToSite` → `false`
   - `requiresPackagingVideo` → `false`
   - `defectivePartReturnPath` → `direct_to_cds`

---

## ✅ **Summary**

This enhanced workflow provides:
- ✅ Granular status tracking (14 statuses vs 5)
- ✅ Branching paths for different delivery scenarios
- ✅ Packaging video and documentation support
- ✅ Approval workflow
- ✅ Complete replacement part tracking
- ✅ Complete defective part return tracking
- ✅ OEM response tracking
- ✅ Better analytics and reporting capabilities

The system now supports all your business scenarios:
1. Replacement parts coming to CDS first
2. Direct shipment to site
3. Packaging video requirements
4. Repackaging at CDS
5. Multiple return paths

