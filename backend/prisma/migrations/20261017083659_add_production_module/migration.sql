-- AlterTable
ALTER TABLE "products" ADD COLUMN     "available_for_sale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "damaged_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "min_stock_level" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(15,2),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_receipts" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "total_cost" DECIMAL(15,2) NOT NULL,
    "supplier" TEXT,
    "invoice_no" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" SERIAL NOT NULL,
    "batch_no" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity_produced" DOUBLE PRECISION NOT NULL,
    "quantity_good" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity_damaged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waste_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damaged_reason" TEXT,
    "production_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift" TEXT,
    "workers_count" INTEGER NOT NULL DEFAULT 0,
    "machine_used" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "released_to_sales" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMP(3),
    "released_by" INTEGER,
    "reported_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_usages" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity_used" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_name_key" ON "raw_materials"("name");

-- CreateIndex
CREATE INDEX "raw_materials_status_idx" ON "raw_materials"("status");

-- CreateIndex
CREATE INDEX "raw_material_receipts_material_id_idx" ON "raw_material_receipts"("material_id");

-- CreateIndex
CREATE INDEX "raw_material_receipts_received_at_idx" ON "raw_material_receipts"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_batch_no_key" ON "production_batches"("batch_no");

-- CreateIndex
CREATE INDEX "production_batches_product_id_idx" ON "production_batches"("product_id");

-- CreateIndex
CREATE INDEX "production_batches_production_date_idx" ON "production_batches"("production_date");

-- CreateIndex
CREATE INDEX "production_batches_released_to_sales_idx" ON "production_batches"("released_to_sales");

-- CreateIndex
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");

-- CreateIndex
CREATE INDEX "production_usages_batch_id_idx" ON "production_usages"("batch_id");

-- CreateIndex
CREATE INDEX "production_usages_material_id_idx" ON "production_usages"("material_id");

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_usages" ADD CONSTRAINT "production_usages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_usages" ADD CONSTRAINT "production_usages_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
