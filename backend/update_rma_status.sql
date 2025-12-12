-- Update RMA Status Enum
-- This updates the status values to match the actual business workflow

-- Step 1: Create new enum type with updated values
CREATE TYPE "RmaStatus_new" AS ENUM (
  'open',
  'rma-raised-yet-to-deliver',
  'faulty-in-transit-to-cds',
  'closed',
  'cancelled'
);

-- Step 2: Migrate existing data to new values
-- Map old statuses to new ones
UPDATE "rma_cases"
SET "status" = CASE
  WHEN "status" = 'pending' THEN 'open'
  WHEN "status" = 'approved' THEN 'rma-raised-yet-to-deliver'
  WHEN "status" = 'in-transit' THEN 'faulty-in-transit-to-cds'
  WHEN "status" = 'received' THEN 'faulty-in-transit-to-cds'
  WHEN "status" = 'completed' THEN 'closed'
  WHEN "status" = 'cancelled' THEN 'cancelled'
  ELSE 'open'
END::text;

-- Step 3: Alter column to use new enum
ALTER TABLE "rma_cases" 
  ALTER COLUMN "status" TYPE "RmaStatus_new" 
  USING "status"::text::"RmaStatus_new";

-- Step 4: Drop old enum and rename new one
DROP TYPE IF EXISTS "RmaStatus";
ALTER TYPE "RmaStatus_new" RENAME TO "RmaStatus";

-- Complete!
SELECT 'RMA Status enum updated successfully!' as status;
