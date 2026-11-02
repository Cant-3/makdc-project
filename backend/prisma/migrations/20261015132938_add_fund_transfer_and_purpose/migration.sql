-- AlterTable
ALTER TABLE "company_accounts" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'general';

-- CreateTable
CREATE TABLE "fund_transfers" (
    "id" SERIAL NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "from_account_id" INTEGER NOT NULL,
    "to_account_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "reason" TEXT,
    "notes" TEXT,
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
    "executed_at" TIMESTAMP(3),
    "executed_by" TEXT,
    "from_balance_before" DECIMAL(15,2),
    "from_balance_after" DECIMAL(15,2),
    "to_balance_before" DECIMAL(15,2),
    "to_balance_after" DECIMAL(15,2),
    "transaction_out_id" TEXT,
    "transaction_in_id" TEXT,
    "notice_id" TEXT,
    "notice_issued_at" TIMESTAMP(3),
    "notice_issued_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_transfer_id_key" ON "fund_transfers"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_notice_id_key" ON "fund_transfers"("notice_id");

-- CreateIndex
CREATE INDEX "fund_transfers_status_idx" ON "fund_transfers"("status");

-- CreateIndex
CREATE INDEX "fund_transfers_from_account_id_idx" ON "fund_transfers"("from_account_id");

-- CreateIndex
CREATE INDEX "fund_transfers_to_account_id_idx" ON "fund_transfers"("to_account_id");

-- CreateIndex
CREATE INDEX "fund_transfers_created_at_idx" ON "fund_transfers"("created_at");

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "company_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "company_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
