-- CreateTable
CREATE TABLE "procurement_request_messages" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_request_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_request_followups" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "status_at_time" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_request_followups_pkey" PRIMARY KEY ("id")
);
