-- AlterTable
ALTER TABLE "case_attachments" 
  ALTER COLUMN "file_path" DROP NOT NULL,
  ADD COLUMN "cloudinary_url" TEXT,
  ADD COLUMN "cloudinary_public_id" TEXT,
  ADD COLUMN "file_type" TEXT;

