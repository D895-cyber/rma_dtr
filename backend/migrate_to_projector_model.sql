-- Migration: Separate ProjectorModel from Projector
-- This allows multiple physical projectors with the same model

-- Step 1: Create projector_models table
CREATE TABLE IF NOT EXISTS "projector_models" (
    "id" TEXT NOT NULL,
    "model_no" TEXT NOT NULL,
    "manufacturer" TEXT,
    "specifications" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projector_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "projector_models_model_no_key" ON "projector_models"("model_no");

-- Step 2: Migrate existing projector data to projector_models
-- Create a model for each existing projector
INSERT INTO "projector_models" ("id", "model_no", "manufacturer", "specifications", "created_at", "updated_at")
SELECT 
    gen_random_uuid(),
    "model_no",
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projectors"
WHERE "model_no" NOT IN (SELECT "model_no" FROM "projector_models")
ON CONFLICT ("model_no") DO NOTHING;

-- Step 3: Add new columns to projectors table
ALTER TABLE "projectors" ADD COLUMN IF NOT EXISTS "projector_model_id" TEXT;
ALTER TABLE "projectors" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "projectors" ADD COLUMN IF NOT EXISTS "installation_date" TIMESTAMP(3);
ALTER TABLE "projectors" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Step 4: Populate projector_model_id for existing projectors
UPDATE "projectors" p
SET "projector_model_id" = pm."id"
FROM "projector_models" pm
WHERE p."model_no" = pm."model_no"
AND p."projector_model_id" IS NULL;

-- Step 5: Make projector_model_id NOT NULL (after data is populated)
ALTER TABLE "projectors" ALTER COLUMN "projector_model_id" SET NOT NULL;

-- Step 6: Update parts table to use projector_model_id
ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "projector_model_id_new" TEXT;

-- Populate new column
UPDATE "parts" pt
SET "projector_model_id_new" = pm."id"
FROM "projector_models" pm
WHERE pt."projector_model_no" = pm."model_no"
AND pt."projector_model_id_new" IS NULL;

-- Drop old foreign key constraint
ALTER TABLE "parts" DROP CONSTRAINT IF EXISTS "parts_projector_model_no_fkey";

-- Drop old unique constraint
ALTER TABLE "parts" DROP CONSTRAINT IF EXISTS "parts_part_number_projector_model_no_key";

-- Make new column NOT NULL
ALTER TABLE "parts" ALTER COLUMN "projector_model_id_new" SET NOT NULL;

-- Rename columns
ALTER TABLE "parts" DROP COLUMN IF EXISTS "projector_model_no";
ALTER TABLE "parts" RENAME COLUMN "projector_model_id_new" TO "projector_model_id";

-- Step 7: Remove old model_no from projectors
-- Drop unique constraint first
ALTER TABLE "projectors" DROP CONSTRAINT IF EXISTS "projectors_model_no_key";

-- Remove the column
ALTER TABLE "projectors" DROP COLUMN IF EXISTS "model_no";

-- Step 8: Add foreign key constraints
ALTER TABLE "projectors" ADD CONSTRAINT "projectors_projector_model_id_fkey" 
    FOREIGN KEY ("projector_model_id") REFERENCES "projector_models"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "parts" ADD CONSTRAINT "parts_projector_model_id_fkey" 
    FOREIGN KEY ("projector_model_id") REFERENCES "projector_models"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add indexes
CREATE INDEX IF NOT EXISTS "projectors_projector_model_id_idx" ON "projectors"("projector_model_id");
CREATE INDEX IF NOT EXISTS "parts_projector_model_id_idx" ON "parts"("projector_model_id");

-- Step 10: Add unique constraint on parts
CREATE UNIQUE INDEX IF NOT EXISTS "parts_part_number_projector_model_id_key" 
    ON "parts"("part_number", "projector_model_id");

-- Complete!
SELECT 'Migration completed successfully!' as status;
