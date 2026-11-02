-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "marketing_plan_id" INTEGER;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketing_plan_id_fkey" FOREIGN KEY ("marketing_plan_id") REFERENCES "marketing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
