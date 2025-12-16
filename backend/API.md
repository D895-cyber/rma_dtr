# 🔌 Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "password123",
  "role": "engineer"  // staff | engineer | manager | admin
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 👥 User Management

### Get All Users
```http
GET /api/users?role=engineer&active=true&search=john
```

### Get Engineers List
```http
GET /api/users/engineers
```

### Create User (Admin Only)
```http
POST /api/users
Content-Type: application/json

{
  "name": "Sarah Engineer",
  "email": "sarah@company.com",
  "password": "password123",
  "role": "engineer",
  "active": true
}
```

### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "active": false
}
```

### Delete User (Admin Only)
```http
DELETE /api/users/:id
```

---

## 🏢 Master Data

### Sites

```http
GET /api/master-data/sites?search=ABC
GET /api/master-data/sites/:id
POST /api/master-data/sites
PUT /api/master-data/sites/:id
DELETE /api/master-data/sites/:id

Body for POST/PUT:
{
  "siteName": "ABC Conference Center"
}
```

### Audis

```http
GET /api/master-data/audis?siteId=xxx
GET /api/master-data/audis/:id
POST /api/master-data/audis
PUT /api/master-data/audis/:id
DELETE /api/master-data/audis/:id

Body for POST/PUT:
{
  "audiNo": "Audi 1",
  "siteId": "site-uuid",
  "projectorId": "projector-uuid"  // optional
}
```

### Projectors

```http
GET /api/master-data/projectors?search=Epson
GET /api/master-data/projectors/:id
POST /api/master-data/projectors
PUT /api/master-data/projectors/:id
DELETE /api/master-data/projectors/:id

Body for POST/PUT:
{
  "modelNo": "Epson EB-L1500U",
  "serialNumber": "SN123456789"
}
```

---

## 📋 DTR Case Management

### Get All DTR Cases
```http
GET /api/dtr?status=open&severity=high&assignedTo=user-id&search=issue&page=1&limit=20

Query Parameters:
- status: open | in_progress | closed | escalated
- severity: low | medium | high | critical
- assignedTo: user ID
- search: search term
- page: page number (default: 1)
- limit: results per page (default: 20)
```

### Get DTR Case by ID
```http
GET /api/dtr/:id
```

### Create DTR Case
```http
POST /api/dtr
Content-Type: application/json

{
  "caseNumber": "241205",
  "errorDate": "2024-01-15",
  "siteId": "site-uuid",
  "audiId": "audi-uuid",
  "unitModel": "Epson EB-L1500U",
  "unitSerial": "SN123456789",
  "natureOfProblem": "Projector not turning on",
  "actionTaken": "Checked power supply",
  "remarks": "Additional notes",
  "callStatus": "open",  // open | in_progress | closed | escalated
  "caseSeverity": "high",  // low | medium | high | critical
  "assignedTo": "user-uuid"  // optional
}
```

### Update DTR Case
```http
PUT /api/dtr/:id
Content-Type: application/json

{
  "actionTaken": "Replaced power supply",
  "callStatus": "in_progress"
}
```

### Assign DTR Case
```http
POST /api/dtr/:id/assign
Content-Type: application/json

{
  "assignedTo": "engineer-user-id"
}
```

### Update DTR Status
```http
POST /api/dtr/:id/status
Content-Type: application/json

{
  "status": "in_progress"  // open | in_progress | closed | escalated
}
```

### Close DTR Case
```http
POST /api/dtr/:id/close
Content-Type: application/json

{
  "finalRemarks": "Issue resolved, replaced PSU"
}
```

### Delete DTR Case (Admin Only)
```http
DELETE /api/dtr/:id
```

### Get DTR Audit Log
```http
GET /api/dtr/:id/audit-log
```

---

## 📦 RMA Case Management

### Get All RMA Cases
```http
GET /api/rma?status=pending&type=RMA&assignedTo=user-id&search=product&page=1&limit=20

Query Parameters:
- status: pending | approved | in_transit | received | completed | cancelled
- type: RMA | CI_RMA | Lamps
- assignedTo: user ID
- search: search term
- page: page number
- limit: results per page
```

### Get RMA Case by ID
```http
GET /api/rma/:id
```

### Create RMA Case
```http
POST /api/rma
Content-Type: application/json

{
  "rmaType": "RMA",  // RMA | CI_RMA | Lamps
  "callLogNumber": "DTR-123",  // optional
  "rmaNumber": "RMA-001",
  "rmaOrderNumber": "ORD-001",
  "rmaRaisedDate": "2024-01-20",
  "customerErrorDate": "2024-01-18",
  "siteId": "site-uuid",
  "audiId": "audi-uuid",  // optional
  "productName": "Epson EB-L1500U",
  "productPartNumber": "EB-L1500U",
  "serialNumber": "SN123456789",
  "defectivePartNumber": "PSU-001",  // optional
  "defectivePartName": "Power Supply",  // optional
  "defectivePartSerial": "PSU123",  // optional
  "replacedPartNumber": "PSU-002",  // optional
  "replacedPartSerial": "PSU456",  // optional
  "symptoms": "Device not powering on",
  "shippingCarrier": "FedEx",  // optional
  "trackingNumberOut": "TRACK123",  // optional
  "shippedDate": "2024-01-21",  // optional
  "returnShippedDate": "2024-01-25",  // optional
  "returnTrackingNumber": "TRACK456",  // optional
  "returnShippedThrough": "UPS",  // optional
  "status": "pending",  // pending | approved | in_transit | received | completed | cancelled
  "assignedTo": "user-uuid",  // optional
  "notes": "Additional information"  // optional
}
```

### Update RMA Case
```http
PUT /api/rma/:id
Content-Type: application/json

{
  "status": "approved",
  "notes": "Approved by manager"
}
```

### Assign RMA Case
```http
POST /api/rma/:id/assign
Content-Type: application/json

{
  "assignedTo": "engineer-user-id"
}
```

### Update RMA Status
```http
POST /api/rma/:id/status
Content-Type: application/json

{
  "status": "in_transit"  // pending | approved | in_transit | received | completed | cancelled
}
```

### Update RMA Tracking
```http
POST /api/rma/:id/tracking
Content-Type: application/json

{
  "shippingCarrier": "FedEx",
  "trackingNumberOut": "TRACK123456",
  "shippedDate": "2024-01-22",
  "returnShippedDate": "2024-01-25",
  "returnTrackingNumber": "TRACK789",
  "returnShippedThrough": "UPS"
}
```

### Delete RMA Case (Admin Only)
```http
DELETE /api/rma/:id
```

### Get RMA Audit Log
```http
GET /api/rma/:id/audit-log
```

---

## 🔔 Notifications

### Get User Notifications
```http
GET /api/notifications?read=false&page=1&limit=20

Query Parameters:
- read: true | false (optional)
- page: page number
- limit: results per page
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
```

### Mark All Notifications as Read
```http
PUT /api/notifications/mark-all-read
```

### Delete Notification
```http
DELETE /api/notifications/:id
```

### Delete All Read Notifications
```http
DELETE /api/notifications/read/all
```

---

## 📊 Analytics

### Get Dashboard Statistics
```http
GET /api/analytics/dashboard

Returns:
{
  "dtr": {
    "total": 150,
    "open": 20,
    "inProgress": 30,
    "closed": 95,
    "critical": 5,
    "myAssigned": 10,
    "recent": 15
  },
  "rma": {
    "total": 80,
    "pending": 10,
    "approved": 20,
    "inTransit": 15,
    "completed": 30,
    "myAssigned": 5,
    "recent": 8
  },
  "severity": {
    "low": 50,
    "medium": 60,
    "high": 30,
    "critical": 10
  }
}
```

### Get Trends
```http
GET /api/analytics/trends?period=7d&type=dtr

Query Parameters:
- period: 7d | 30d | 90d
- type: dtr | rma

Returns:
{
  "trends": [
    { "date": "2024-01-15", "count": 5 },
    { "date": "2024-01-16", "count": 8 },
    ...
  ]
}
```

### Get Severity Breakdown
```http
GET /api/analytics/severity-breakdown

Returns:
{
  "low": 50,
  "medium": 60,
  "high": 30,
  "critical": 10
}
```

### Get Engineer Performance (Admin/Manager Only)
```http
GET /api/analytics/engineer-performance

Returns:
{
  "engineers": [
    {
      "id": "user-uuid",
      "name": "John Engineer",
      "email": "john@company.com",
      "dtr": {
        "assigned": 25,
        "closed": 20
      },
      "rma": {
        "assigned": 15,
        "completed": 12
      },
      "totalAssigned": 40,
      "totalCompleted": 32
    }
  ]
}
```

### Get Site Statistics
```http
GET /api/analytics/site-stats

Returns:
{
  "sites": [
    {
      "id": "site-uuid",
      "siteName": "ABC Conference Center",
      "_count": {
        "audis": 5,
        "dtrCases": 30,
        "rmaCases": 15
      }
    }
  ]
}
```

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details (development only)"
}
```

---

## 🔒 Role-Based Access

| Endpoint | Staff | Engineer | Manager | Admin |
|----------|-------|----------|---------|-------|
| Create User | ❌ | ❌ | ❌ | ✅ |
| Delete User | ❌ | ❌ | ❌ | ✅ |
| Update User | ❌ | ❌ | ✅ | ✅ |
| Create DTR/RMA | ✅ | ✅ | ✅ | ✅ |
| Update DTR/RMA | ✅ | ✅ | ✅ | ✅ |
| Delete DTR/RMA | ❌ | ❌ | ❌ | ✅ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |
| Engineer Performance | ❌ | ❌ | ✅ | ✅ |

---

## 🧪 Testing Examples

### 1. Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@company.com","password":"password123","role":"admin"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"password123"}'

# Save the token from response
TOKEN="<your-token-here>"
```

### 2. Create Master Data
```bash
# Create Site
curl -X POST http://localhost:5000/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteName":"ABC Conference Center"}'

# Create Projector
curl -X POST http://localhost:5000/api/master-data/projectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modelNo":"Epson EB-L1500U","serialNumber":"SN123456789"}'

# Create Audi
curl -X POST http://localhost:5000/api/master-data/audis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audiNo":"Audi 1","siteId":"<site-id>","projectorId":"<projector-id>"}'
```

### 3. Create DTR Case
```bash
curl -X POST http://localhost:5000/api/dtr \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseNumber":"241205",
    "errorDate":"2024-01-15",
    "siteId":"<site-id>",
    "audiId":"<audi-id>",
    "unitModel":"Epson EB-L1500U",
    "unitSerial":"SN123456789",
    "natureOfProblem":"Projector not turning on",
    "callStatus":"open",
    "caseSeverity":"high"
  }'
```

### 4. Get Dashboard Stats
```bash
curl http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📖 Complete Endpoint List

**Total: 60+ endpoints**

- **Auth:** 3 endpoints
- **Users:** 6 endpoints  
- **Sites:** 5 endpoints
- **Audis:** 5 endpoints
- **Projectors:** 5 endpoints
- **DTR Cases:** 9 endpoints
- **RMA Cases:** 10 endpoints
- **Notifications:** 6 endpoints
- **Analytics:** 5 endpoints

---

## 🎯 Next Steps

1. Test endpoints with Postman or curl
2. Import Excel data
3. Connect frontend to API
4. Deploy to production

Need help? Check SETUP.md or README.md!




