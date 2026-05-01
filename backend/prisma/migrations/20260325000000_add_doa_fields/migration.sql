-- AlterTable
ALTER TABLE "rma_cases"
  ADD COLUMN "doa_decision_at" TIMESTAMP(3),
  ADD COLUMN "doa_decision_by" TEXT,
  ADD COLUMN "doa_notes" TEXT,
  ADD COLUMN "doa_suggested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "doa_suggested_by_case_id" TEXT,
  ADD COLUMN "doa_suggested_window_days" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "is_doa" BOOLEAN;

-- CreateIndex
CREATE INDEX "rma_cases_is_doa_idx" ON "rma_cases"("is_doa");

-- CreateIndex
CREATE INDEX "rma_cases_doa_suggested_idx" ON "rma_cases"("doa_suggested");

