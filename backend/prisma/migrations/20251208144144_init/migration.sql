-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('staff', 'engineer', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "DtrCallStatus" AS ENUM ('open', 'in-progress', 'closed', 'escalated');

-- CreateEnum
CREATE TYPE "CaseSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "RmaType" AS ENUM ('RMA', 'CI RMA', 'Lamps');

-- CreateEnum
CREATE TYPE "RmaStatus" AS ENUM ('pending', 'approved', 'in-transit', 'received', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('DTR', 'RMA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('assignment', 'status-change', 'escalation', 'info');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectors" (
    "id" TEXT NOT NULL,
    "model_no" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audis" (
    "id" TEXT NOT NULL,
    "audi_no" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "projector_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dtr_cases" (
    "id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "error_date" DATE NOT NULL,
    "site_id" TEXT NOT NULL,
    "audi_id" TEXT NOT NULL,
    "unit_model" TEXT NOT NULL,
    "unit_serial" TEXT NOT NULL,
    "nature_of_problem" TEXT NOT NULL,
    "action_taken" TEXT,
    "remarks" TEXT,
    "call_status" "DtrCallStatus" NOT NULL,
    "case_severity" "CaseSeverity" NOT NULL,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "closed_by" TEXT,
    "closed_date" TIMESTAMP(3),
    "final_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dtr_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rma_cases" (
    "id" TEXT NOT NULL,
    "rma_type" "RmaType" NOT NULL,
    "call_log_number" TEXT,
    "rma_number" TEXT NOT NULL,
    "rma_order_number" TEXT NOT NULL,
    "rma_raised_date" DATE NOT NULL,
    "customer_error_date" DATE NOT NULL,
    "site_id" TEXT NOT NULL,
    "audi_id" TEXT,
    "product_name" TEXT NOT NULL,
    "product_part_number" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "defective_part_number" TEXT,
    "defective_part_name" TEXT,
    "defective_part_serial" TEXT,
    "replaced_part_number" TEXT,
    "replaced_part_serial" TEXT,
    "symptoms" TEXT,
    "shipping_carrier" TEXT,
    "tracking_number_out" TEXT,
    "shipped_date" DATE,
    "return_shipped_date" DATE,
    "return_tracking_number" TEXT,
    "return_shipped_through" TEXT,
    "status" "RmaStatus" NOT NULL,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rma_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "case_type" "CaseType" NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "case_id" TEXT NOT NULL,
    "case_type" "CaseType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projectors_serial_number_key" ON "projectors"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "dtr_cases_case_number_key" ON "dtr_cases"("case_number");

-- CreateIndex
CREATE INDEX "dtr_cases_call_status_idx" ON "dtr_cases"("call_status");

-- CreateIndex
CREATE INDEX "dtr_cases_assigned_to_idx" ON "dtr_cases"("assigned_to");

-- CreateIndex
CREATE INDEX "dtr_cases_created_at_idx" ON "dtr_cases"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rma_cases_rma_number_key" ON "rma_cases"("rma_number");

-- CreateIndex
CREATE INDEX "rma_cases_status_idx" ON "rma_cases"("status");

-- CreateIndex
CREATE INDEX "rma_cases_assigned_to_idx" ON "rma_cases"("assigned_to");

-- CreateIndex
CREATE INDEX "rma_cases_created_at_idx" ON "rma_cases"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_case_id_case_type_idx" ON "audit_logs"("case_id", "case_type");

-- CreateIndex
CREATE INDEX "audit_logs_performed_at_idx" ON "audit_logs"("performed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "audis" ADD CONSTRAINT "audis_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audis" ADD CONSTRAINT "audis_projector_id_fkey" FOREIGN KEY ("projector_id") REFERENCES "projectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtr_cases" ADD CONSTRAINT "dtr_cases_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtr_cases" ADD CONSTRAINT "dtr_cases_audi_id_fkey" FOREIGN KEY ("audi_id") REFERENCES "audis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtr_cases" ADD CONSTRAINT "dtr_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtr_cases" ADD CONSTRAINT "dtr_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtr_cases" ADD CONSTRAINT "dtr_cases_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rma_cases" ADD CONSTRAINT "rma_cases_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rma_cases" ADD CONSTRAINT "rma_cases_audi_id_fkey" FOREIGN KEY ("audi_id") REFERENCES "audis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rma_cases" ADD CONSTRAINT "rma_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rma_cases" ADD CONSTRAINT "rma_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
