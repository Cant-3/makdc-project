/*
  Warnings:

  - A unique constraint covering the columns `[receipt_number]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "delivered_by" INTEGER,
ADD COLUMN     "delivery_date" TIMESTAMP(3),
ADD COLUMN     "delivery_info" TEXT,
ADD COLUMN     "payment_account_id" INTEGER,
ADD COLUMN     "payment_deadline" TIMESTAMP(3),
ADD COLUMN     "payment_instructions" TEXT,
ADD COLUMN     "payment_reference" TEXT,
ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "payment_verified_at" TIMESTAMP(3),
ADD COLUMN     "payment_verified_by" INTEGER,
ADD COLUMN     "postpaid_approved_at" TIMESTAMP(3),
ADD COLUMN     "postpaid_approved_by" INTEGER,
ADD COLUMN     "receipt_issued_at" TIMESTAMP(3),
ADD COLUMN     "receipt_issued_by" INTEGER,
ADD COLUMN     "receipt_number" TEXT,
ADD COLUMN     "reviewed_at_sales" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_sales" INTEGER,
ADD COLUMN     "sales_review_notes" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "company_accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "branch" TEXT,
    "swift_code" TEXT,
    "instructions" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_receipt_number_key" ON "orders"("receipt_number");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_reviewed_by_sales_fkey" FOREIGN KEY ("reviewed_by_sales") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "company_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_verified_by_fkey" FOREIGN KEY ("payment_verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_postpaid_approved_by_fkey" FOREIGN KEY ("postpaid_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_receipt_issued_by_fkey" FOREIGN KEY ("receipt_issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_accounts" ADD CONSTRAINT "company_accounts_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_accounts" ADD CONSTRAINT "company_accounts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
