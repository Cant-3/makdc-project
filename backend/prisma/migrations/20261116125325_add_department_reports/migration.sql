-- CreateTable
CREATE TABLE "department_reports" (
    "id" SERIAL NOT NULL,
    "report_number" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "summary" TEXT,
    "metrics" JSONB,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "ceo_notes" TEXT,

    CONSTRAINT "department_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_reports_report_number_key" ON "department_reports"("report_number");
