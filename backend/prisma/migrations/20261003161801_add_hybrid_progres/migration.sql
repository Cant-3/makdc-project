-- AlterTable
ALTER TABLE "marketing_plans" ADD COLUMN     "activity_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight_customers" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "weight_leads" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "weight_revenue" INTEGER NOT NULL DEFAULT 50;
