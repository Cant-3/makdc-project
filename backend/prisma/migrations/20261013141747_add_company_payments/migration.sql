-- CreateTable
CREATE TABLE "company_payments" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "method" TEXT,
    "description" TEXT,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "sent_to_manager_at" TIMESTAMP(3),
    "sent_to_manager_by" TEXT,
    "manager_verified_at" TIMESTAMP(3),
    "manager_verified_by" TEXT,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_payments_reference_key" ON "company_payments"("reference");

-- CreateIndex
CREATE INDEX "company_payments_status_idx" ON "company_payments"("status");

-- CreateIndex
CREATE INDEX "company_payments_type_idx" ON "company_payments"("type");

-- CreateIndex
CREATE INDEX "company_payments_created_at_idx" ON "company_payments"("created_at");
