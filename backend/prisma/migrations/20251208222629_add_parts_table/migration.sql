-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "projector_model_no" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parts_projector_model_no_idx" ON "parts"("projector_model_no");

-- CreateIndex
CREATE UNIQUE INDEX "parts_part_number_projector_model_no_key" ON "parts"("part_number", "projector_model_no");

-- CreateIndex
CREATE UNIQUE INDEX "projectors_model_no_key" ON "projectors"("model_no");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_projector_model_no_fkey" FOREIGN KEY ("projector_model_no") REFERENCES "projectors"("model_no") ON DELETE CASCADE ON UPDATE CASCADE;
