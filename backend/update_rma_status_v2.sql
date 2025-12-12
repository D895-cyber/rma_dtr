-- Simpler approach: Drop and recreate the enum

-- Step 1: Drop the default constraint if it exists
ALTER TABLE "rma_cases" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Convert column to text temporarily
ALTER TABLE "rma_cases" ALTER COLUMN "status" TYPE TEXT;

-- Step 3: Update values
UPDATE "rma_cases" SET "status" = 
  CASE
    WHEN "status" = 'pending' THEN 'open'
    WHEN "status" = 'approved' THEN 'rma-raised-yet-to-deliver'
    WHEN "status" = 'in-transit' THEN 'faulty-in-transit-to-cds'
    WHEN "status" = 'received' THEN 'faulty-in-transit-to-cds'
    WHEN "status" = 'completed' THEN 'closed'
    WHEN "status" = 'cancelled' THEN 'cancelled'
    ELSE 'open'
  END;

-- Step 4: Drop old enum
DROP TYPE IF EXISTS "RmaStatus";

-- Step 5: Create new enum
CREATE TYPE "RmaStatus" AS ENUM (
  'open',
  'rma-raised-yet-to-deliver',
  'faulty-in-transit-to-cds',
  'closed',
  'cancelled'
);

-- Step 6: Convert column back to enum
ALTER TABLE "rma_cases" ALTER COLUMN "status" TYPE "RmaStatus" USING "status"::"RmaStatus";

-- Step 7: Set default
ALTER TABLE "rma_cases" ALTER COLUMN "status" SET DEFAULT 'open'::"RmaStatus";

SELECT 'RMA Status enum updated successfully!' as message;
