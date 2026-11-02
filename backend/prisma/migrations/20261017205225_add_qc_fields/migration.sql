-- AlterTable
ALTER TABLE "production_batches" ADD COLUMN     "qc_checked_at" TIMESTAMP(3),
ADD COLUMN     "qc_checked_by" INTEGER,
ADD COLUMN     "qc_notes" TEXT,
ADD COLUMN     "qc_status" TEXT;
