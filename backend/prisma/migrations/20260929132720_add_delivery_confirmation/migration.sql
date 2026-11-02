-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "delivery_confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "delivery_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "delivery_confirmed_by" TEXT;
