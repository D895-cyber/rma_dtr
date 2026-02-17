-- CreateTable
CREATE TABLE "projector_transfers" (
    "id" TEXT NOT NULL,
    "projector_id" TEXT NOT NULL,
    "from_site_id" TEXT,
    "from_audi_id" TEXT,
    "to_site_id" TEXT NOT NULL,
    "to_audi_id" TEXT NOT NULL,
    "moved_by" TEXT,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "projector_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projector_transfers_projector_id_moved_at_idx" ON "projector_transfers"("projector_id", "moved_at");

-- AddForeignKey
ALTER TABLE "projector_transfers" ADD CONSTRAINT "projector_transfers_projector_id_fkey" FOREIGN KEY ("projector_id") REFERENCES "projectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;





