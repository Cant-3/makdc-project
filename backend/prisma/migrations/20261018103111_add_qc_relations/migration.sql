/*
  Warnings:

  - A unique constraint covering the columns `[qc_notice_no]` on the table `production_batches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "production_batches" ADD COLUMN     "qc_inspector_name" TEXT,
ADD COLUMN     "qc_notice_no" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_qc_notice_no_key" ON "production_batches"("qc_notice_no");

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_qc_checked_by_fkey" FOREIGN KEY ("qc_checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
