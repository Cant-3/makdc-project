-- AlterTable
ALTER TABLE "company_accounts" ADD COLUMN     "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ceo_approved_at" TIMESTAMP(3),
ADD COLUMN     "ceo_approved_by" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "manager_verified_at" TIMESTAMP(3),
ADD COLUMN     "manager_verified_by" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sent_to_manager_at" TIMESTAMP(3),
ADD COLUMN     "sent_to_manager_by" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft',
ALTER COLUMN "rejected_by" SET DATA TYPE TEXT;
