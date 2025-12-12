-- Update RMA System with new requirements
-- 1. Update RmaType enum (RMA, SRMA, RMA CL, Lamps)
-- 2. Make rmaNumber and rmaOrderNumber optional
-- 3. Add DNR (Do Not Return) fields
-- 4. Add defectDetails field

-- Step 1: Update RmaType enum
ALTER TYPE "RmaType" RENAME TO "RmaType_old";

CREATE TYPE "RmaType" AS ENUM (
  'RMA',
  'SRMA',
  'RMA CL',
  'Lamps'
);

-- Step 2: Migrate existing RmaType data
ALTER TABLE "rma_cases" ALTER COLUMN "rma_type" TYPE TEXT;

UPDATE "rma_cases"
SET "rma_type" = CASE
  WHEN "rma_type" = 'RMA' THEN 'RMA'
  WHEN "rma_type" = 'CI RMA' THEN 'RMA CL'
  WHEN "rma_type" = 'Lamps' THEN 'Lamps'
  ELSE 'RMA'
END;

ALTER TABLE "rma_cases" 
  ALTER COLUMN "rma_type" TYPE "RmaType" USING "rma_type"::"RmaType";

DROP TYPE "RmaType_old";

-- Step 3: Make rmaNumber and rmaOrderNumber optional
-- First, drop the unique constraint on rma_number if exists
ALTER TABLE "rma_cases" DROP CONSTRAINT IF EXISTS "rma_cases_rma_number_key";

-- Make columns nullable
ALTER TABLE "rma_cases" ALTER COLUMN "rma_number" DROP NOT NULL;
ALTER TABLE "rma_cases" ALTER COLUMN "rma_order_number" DROP NOT NULL;

-- Step 4: Add new columns for DNR and defect details
ALTER TABLE "rma_cases" 
  ADD COLUMN IF NOT EXISTS "defect_details" TEXT,
  ADD COLUMN IF NOT EXISTS "is_defective_part_dnr" BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "defective_part_dnr_reason" TEXT;

-- Step 5: Set default status if NULL
ALTER TABLE "rma_cases" ALTER COLUMN "status" SET DEFAULT 'open'::"RmaStatus";

-- Step 6: Create index on rma_number for faster lookups
CREATE INDEX IF NOT EXISTS "rma_cases_rma_number_idx" ON "rma_cases"("rma_number");

SELECT 'RMA system updated successfully!' as message;
