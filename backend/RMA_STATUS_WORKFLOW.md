# 📋 RMA Status Workflow - Complete Guide

## ✅ Updated RMA Statuses

Your RMA statuses have been updated to match your actual business workflow!

---

## 🔄 **RMA Status Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    RMA LIFECYCLE                             │
└─────────────────────────────────────────────────────────────┘

1. OPEN
   ├─ Description: Case is open, observation is going on
   ├─ Actions: Diagnosis, troubleshooting
   └─ Next: Decide if RMA is needed
           ↓
2. RMA RAISED - YET TO DELIVER
   ├─ Description: RMA approved, waiting for replacement part
   ├─ Actions: Order replacement, wait for delivery
   └─ Next: Replacement arrives → Install
           ↓
3. FAULTY IN TRANSIT TO CDS
   ├─ Description: Defective part being shipped back from site
   ├─ Actions: Track shipment, wait for receipt
   └─ Next: Receive defective part → Ship to OEM
           ↓
4. CLOSED
   ├─ Description: RMA complete, defective part shipped to OEM
   ├─ Actions: Archive case
   └─ End of lifecycle
```

---

## 📊 **RMA Status Enum Values**

| Status | Database Value | Display Name | Description |
|--------|----------------|--------------|-------------|
| 1 | `open` | Open | Case is open, observation is going on |
| 2 | `rma_raised_yet_to_deliver` | RMA Raised - Yet to Deliver | RMA raised but replacement part yet to deliver to site |
| 3 | `faulty_in_transit_to_cds` | Faulty in Transit to CDS | Defective part in transit back to us from site |
| 4 | `closed` | Closed | RMA completed, defective part shipped back to OEM |
| 5 | `cancelled` | Cancelled | RMA cancelled |

---

## 🎯 **Creating RMA with Different Statuses**

### **Status 1: Open (Initial)**

```bash
POST /api/rma
{
  "rmaType": "RMA",
  "rmaNumber": "RMA-001",
  "rmaOrderNumber": "ORD-001",
  "rmaRaisedDate": "2024-01-20",
  "customerErrorDate": "2024-01-18",
  "siteId": "site-uuid",
  "audiId": "audi-uuid",
  "productName": "Projector Lamp",
  "productPartNumber": "ELPLP88",
  "serialNumber": "LAMP-001",
  "defectDetails": "Lamp not working",
  "status": "open"
}
```

### **Status 2: RMA Raised - Yet to Deliver**

```bash
PUT /api/rma/{id}
{
  "status": "rma_raised_yet_to_deliver",
  "replacedPartNumber": "ELPLP88-NEW",
  "replacedPartSerial": "NEW-LAMP-001"
}
```

### **Status 3: Faulty in Transit to CDS**

```bash
POST /api/rma/{id}/tracking
{
  "returnTrackingNumber": "DHL-12345",
  "returnShippedThrough": "DHL Express",
  "returnShippedDate": "2024-01-25",
  "status": "faulty_in_transit_to_cds"
}
```

### **Status 4: Closed**

```bash
PUT /api/rma/{id}
{
  "status": "closed",
  "notes": "Defective part shipped to OEM via FedEx. Case completed."
}
```

---

## 📋 **Complete RMA Workflow Example**

```bash
TOKEN="your-token"

# STEP 1: Create RMA (Status: Open)
RMA_RESPONSE=$(curl -s -X POST http://localhost:5001/api/rma \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rmaType": "RMA",
    "rmaNumber": "RMA-2024-001",
    "rmaOrderNumber": "ORD-2024-001",
    "rmaRaisedDate": "2024-12-08",
    "customerErrorDate": "2024-12-07",
    "siteId": "c50ea652-304a-4417-ac12-c1c863386a24",
    "audiId": "9c60bb6a-a07f-4eb4-8f79-172313eb8b2e",
    "productName": "Projector Lamp",
    "productPartNumber": "ELPLP88",
    "serialNumber": "LAMP-DEFECT-001",
    "defectDetails": "Lamp burnt out prematurely",
    "symptoms": "No display, lamp indicator shows error",
    "status": "open"
  }')

echo "$RMA_RESPONSE" | python3 -m json.tool | head -20
RMA_ID=$(echo "$RMA_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['rmaCase']['id'])" 2>/dev/null)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Approve RMA (Status: RMA Raised - Yet to Deliver)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s -X PUT "http://localhost:5001/api/rma/$RMA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rma_raised_yet_to_deliver",
    "replacedPartNumber": "ELPLP88-NEW",
    "replacedPartSerial": "LAMP-NEW-789"
  }' | python3 -m json.tool | head -15

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Ship Defective Part (Status: Faulty in Transit)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s -X POST "http://localhost:5001/api/rma/$RMA_ID/tracking" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "returnTrackingNumber": "DHL-123456",
    "returnShippedThrough": "DHL Express",
    "returnShippedDate": "2024-12-08"
  }' | python3 -m json.tool | head -15

curl -s -X PUT "http://localhost:5001/api/rma/$RMA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "faulty_in_transit_to_cds"}' | python3 -m json.tool | head -15

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Close RMA (Status: Closed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s -X PUT "http://localhost:5001/api/rma/$RMA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "notes": "Defective part received and shipped to OEM. Case completed."
  }' | python3 -m json.tool | head -15

echo ""
echo "✅ Complete RMA workflow tested!"








