# ⚡ Quick Fixes Guide - Immediate Improvements

This guide provides step-by-step instructions for the most critical fixes that can be implemented in under 2 hours.

---

## 🔴 **Fix 1: Pagination Limits (5 minutes)**

### Problem
Default limit of `10000` causes connection pool exhaustion and slow queries.

### Solution

**File:** `backend/src/controllers/dtr.controller.ts`
```typescript
// Line 10 - Change from:
const { status, severity, assignedTo, search, page = '1', limit = '10000' } = req.query;

// To:
const { status, severity, assignedTo, search, page = '1', limit = '50' } = req.query;
const maxLimit = 100; // Maximum allowed limit
const take = Math.min(Number(limit), maxLimit);
const skip = (Number(page) - 1) * take;
```

**File:** `backend/src/controllers/rma.controller.ts`
```typescript
// Line 10 - Change from:
const { status, type, assignedTo, search, page = '1', limit = '10000' } = req.query;

// To:
const { status, type, assignedTo, search, page = '1', limit = '50' } = req.query;
const maxLimit = 100; // Maximum allowed limit
const take = Math.min(Number(limit), maxLimit);
const skip = (Number(page) - 1) * take;
```

**Then update the query:**
```typescript
// Change from:
skip,
take,

// To:
skip,
take: take, // Use the calculated take value
```

**Impact:** Reduces database load by 99%+

---

## 🔴 **Fix 2: Add Database Indexes (15 minutes)**

### Problem
Missing indexes on frequently queried fields cause slow queries.

### Solution

**File:** `backend/prisma/schema.prisma`

**Add to DtrCase model:**
```prisma
model DtrCase {
  // ... existing fields ...
  
  @@index([callStatus])
  @@index([caseSeverity])
  @@index([assignedTo])
  @@index([createdAt])
  @@index([caseNumber])
  @@index([siteId, audiId]) // Composite index
  @@map("dtr_cases")
}
```

**Add to RmaCase model:**
```prisma
model RmaCase {
  // ... existing fields ...
  
  @@index([rmaRaisedDate]) // Add this if not present
  @@index([productPartNumber])
  @@index([defectivePartNumber])
  @@index([status, assignedTo]) // Composite index
  @@map("rma_cases")
}
```

**Then run migration:**
```bash
cd backend
npx prisma migrate dev --name add_performance_indexes
```

**Impact:** 10-100x faster queries

---

## 🔴 **Fix 3: Optimize Query Includes (30 minutes)**

### Problem
Fetching all nested relations even when not needed.

### Solution

**File:** `backend/src/controllers/dtr.controller.ts`

**Replace the include with select:**
```typescript
// Around line 31-57, change from:
const [cases, total] = await Promise.all([
  prisma.dtrCase.findMany({
    where,
    include: {
      site: true,
      audi: {
        include: {
          projector: {
            include: {
              projectorModel: true,
            },
          },
        },
      },
      // ... rest
    },
    // ...
  }),
  // ...
]);

// To:
const [cases, total] = await Promise.all([
  prisma.dtrCase.findMany({
    where,
    select: {
      id: true,
      caseNumber: true,
      errorDate: true,
      unitModel: true,
      unitSerial: true,
      natureOfProblem: true,
      actionTaken: true,
      remarks: true,
      callStatus: true,
      caseSeverity: true,
      createdAt: true,
      updatedAt: true,
      site: {
        select: {
          id: true,
          siteName: true,
        },
      },
      audi: {
        select: {
          id: true,
          audiNo: true,
          projector: {
            select: {
              id: true,
              serialNumber: true,
              projectorModel: {
                select: {
                  id: true,
                  modelNo: true,
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
      creator: {
        select: { id: true, name: true, email: true, role: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true },
      },
      closer: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  }),
  prisma.dtrCase.count({ where }),
]);
```

**Do the same for RMA controller.**

**Impact:** 50-70% reduction in data transfer

---

## 🟠 **Fix 4: Add Rate Limiting (30 minutes)**

### Problem
No protection against API abuse or brute force attacks.

### Solution

**Install package:**
```bash
cd backend
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

**Create:** `backend/src/middleware/rateLimit.middleware.ts`
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});
```

**Update:** `backend/src/routes/auth.routes.ts`
```typescript
import { authLimiter } from '../middleware/rateLimit.middleware';

// Apply to login route
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

**Update:** `backend/src/server.ts`
```typescript
import { apiLimiter } from './middleware/rateLimit.middleware';

// Apply to all API routes
app.use('/api', apiLimiter);
```

**Impact:** Prevents brute force and API abuse

---

## 🟠 **Fix 5: Add Health Check (10 minutes)**

### Problem
No way to monitor system health.

### Solution

**Create:** `backend/src/controllers/health.controller.ts`
```typescript
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.util';

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Create:** `backend/src/routes/health.routes.ts`
```typescript
import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

router.get('/', healthCheck);

export default router;
```

**Update:** `backend/src/server.ts`
```typescript
import healthRoutes from './routes/health.routes';

// Add before other routes
app.use('/health', healthRoutes);
```

**Impact:** Better monitoring and deployment checks

---

## 🟡 **Fix 6: Add Request ID Tracking (10 minutes)**

### Problem
Hard to trace requests across logs.

### Solution

**Install package:**
```bash
cd backend
npm install uuid
npm install --save-dev @types/uuid
```

**Create:** `backend/src/middleware/requestId.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
```

**Update:** `backend/src/server.ts`
```typescript
import { requestIdMiddleware } from './middleware/requestId.middleware';

// Add early in middleware chain
app.use(requestIdMiddleware);
```

**Update:** `backend/src/utils/response.util.ts`
```typescript
export function sendError(res: Response, message: string, statusCode: number = 400, error?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    requestId: res.getHeader('X-Request-ID'),
    timestamp: new Date().toISOString(),
  });
}
```

**Impact:** Easier debugging and error tracking

---

## 📋 **Implementation Checklist**

- [ ] Fix pagination limits in DTR controller
- [ ] Fix pagination limits in RMA controller
- [ ] Add database indexes to schema
- [ ] Run Prisma migration
- [ ] Optimize DTR query includes
- [ ] Optimize RMA query includes
- [ ] Install rate limiting package
- [ ] Add rate limiting middleware
- [ ] Apply rate limiting to routes
- [ ] Add health check endpoint
- [ ] Add request ID middleware
- [ ] Test all changes
- [ ] Restart backend server

---

## ⚠️ **Important Notes**

1. **Test after each fix** - Don't implement all at once
2. **Backup database** - Before running migrations
3. **Monitor performance** - Check if improvements are working
4. **Update frontend** - If pagination changes affect UI
5. **Restart server** - After making changes

---

## 🎯 **Expected Results**

After implementing these fixes:

- ✅ **99% reduction** in database load
- ✅ **10-100x faster** queries
- ✅ **50-70% less** data transfer
- ✅ **Better security** against attacks
- ✅ **Easier debugging** with request IDs
- ✅ **Better monitoring** with health checks

**Total implementation time: ~2 hours**
**Impact: Very High**

---

**Ready to implement? Start with Fix 1 and work your way down!**

