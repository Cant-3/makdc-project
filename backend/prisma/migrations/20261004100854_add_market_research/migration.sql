-- CreateTable
CREATE TABLE "market_research" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "research_type" TEXT NOT NULL,
    "description" TEXT,
    "conducted_by" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "findings" TEXT,
    "summary" TEXT,
    "recommendations" TEXT,
    "attachment_name" TEXT,
    "attachment_data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_research_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "market_research" ADD CONSTRAINT "market_research_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
