-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "employee_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "profile_pic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "region" TEXT,
    "district" TEXT,
    "delivery_address" TEXT,
    "delivery_type" TEXT,
    "expected_date" TIMESTAMP(3),
    "time_slot" TEXT,
    "notes" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "delivered_by" INTEGER,
    "delivery_date" TIMESTAMP(3),
    "delivery_info" TEXT,
    "payment_account_id" INTEGER,
    "payment_deadline" TIMESTAMP(3),
    "payment_instructions" TEXT,
    "payment_reference" TEXT,
    "payment_type" TEXT,
    "payment_verified_at" TIMESTAMP(3),
    "payment_verified_by" INTEGER,
    "postpaid_approved_at" TIMESTAMP(3),
    "postpaid_approved_by" INTEGER,
    "receipt_issued_at" TIMESTAMP(3),
    "receipt_issued_by" INTEGER,
    "receipt_number" TEXT,
    "reviewed_at_sales" TIMESTAMP(3),
    "reviewed_by_sales" INTEGER,
    "sales_review_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "delivery_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "delivery_confirmed_at" TIMESTAMP(3),
    "delivery_confirmed_by" TEXT,
    "marketing_plan_id" INTEGER,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_type" TEXT,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "receipt_number" TEXT,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "basic_salary" DECIMAL(15,2) NOT NULL,
    "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_mode" TEXT,
    "bank_account" TEXT,
    "tin" TEXT,
    "employment_type" TEXT,
    "join_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "contract_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "value" DECIMAL(15,2),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending-review',
    "review_notes" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "signed_by" INTEGER,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_sent" (
    "id" SERIAL NOT NULL,
    "report_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent_by" INTEGER NOT NULL,
    "sent_to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Delivered',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadership" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "photo" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "linkedin" TEXT,
    "phone" TEXT,

    CONSTRAINT "leadership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'per piece',
    "category" TEXT,
    "tag" TEXT,
    "image" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "min_stock_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_for_sale" BOOLEAN NOT NULL DEFAULT false,
    "damaged_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "branch" TEXT,
    "swift_code" TEXT,
    "instructions" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "purpose" TEXT NOT NULL DEFAULT 'general',
    "requested_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_approved_by" TEXT,
    "created_by" TEXT,
    "manager_verified_at" TIMESTAMP(3),
    "manager_verified_by" TEXT,
    "notes" TEXT,
    "sent_to_manager_at" TIMESTAMP(3),
    "sent_to_manager_by" TEXT,

    CONSTRAINT "company_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" SERIAL NOT NULL,
    "customer_name" TEXT NOT NULL,
    "role" TEXT,
    "message" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "photo" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "category" TEXT NOT NULL DEFAULT 'News',
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "author" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "attachment" TEXT,
    "attachment_name" TEXT,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Commercial',
    "description" TEXT,
    "content" TEXT,
    "image" TEXT,
    "location" TEXT,
    "client" TEXT,
    "year" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_slides" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_stats" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_plans" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "budget" DECIMAL(15,2) NOT NULL,
    "channels" TEXT NOT NULL,
    "goals" TEXT,
    "target_audience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target_customers" INTEGER,
    "actual_customers" INTEGER NOT NULL DEFAULT 0,
    "target_revenue" DECIMAL(15,2),
    "actual_revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "target_leads" INTEGER,
    "actual_leads" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "activity_progress" INTEGER NOT NULL DEFAULT 0,
    "weight_customers" INTEGER NOT NULL DEFAULT 30,
    "weight_leads" INTEGER NOT NULL DEFAULT 20,
    "weight_revenue" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "marketing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_activities" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" INTEGER,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "completed_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_activities_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "payrolls" (
    "id" SERIAL NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_to_manager_at" TIMESTAMP(3),
    "sent_to_manager_by" TEXT,
    "manager_verified_at" TIMESTAMP(3),
    "manager_verified_by" TEXT,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "basic_salary" DECIMAL(15,2) NOT NULL,
    "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,2) NOT NULL,
    "payment_mode" TEXT,
    "bank_account" TEXT,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_resources" (
    "id" SERIAL NOT NULL,
    "resource_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "location" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "account_id" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "source" TEXT NOT NULL,
    "source_id" TEXT,
    "source_model" TEXT,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "balance_before" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payments" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "accountId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "method" TEXT,
    "description" TEXT,
    "attachments" JSONB,
    "procurementRequestId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "sent_to_manager_at" TIMESTAMP(3),
    "sent_to_manager_by" TEXT,
    "manager_verified_at" TIMESTAMP(3),
    "manager_verified_by" TEXT,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transfers" (
    "id" SERIAL NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "from_account_id" INTEGER NOT NULL,
    "to_account_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "sent_to_manager_at" TIMESTAMP(3),
    "sent_to_manager_by" TEXT,
    "manager_verified_at" TIMESTAMP(3),
    "manager_verified_by" TEXT,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "executed_at" TIMESTAMP(3),
    "executed_by" TEXT,
    "from_balance_before" DECIMAL(15,2),
    "from_balance_after" DECIMAL(15,2),
    "to_balance_before" DECIMAL(15,2),
    "to_balance_after" DECIMAL(15,2),
    "transaction_out_id" TEXT,
    "transaction_in_id" TEXT,
    "notice_id" TEXT,
    "notice_issued_at" TIMESTAMP(3),
    "notice_issued_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(15,2),
    "description" TEXT,
    "specs" TEXT,
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
    "qc_status" TEXT,
    "qc_notes" TEXT,
    "qc_checked_by" INTEGER,
    "qc_checked_at" TIMESTAMP(3),
    "qc_notice_no" TEXT,
    "qc_inspector_name" TEXT,
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

-- CreateTable
CREATE TABLE "stock_items" (
    "id" SERIAL NOT NULL,
    "item_code" TEXT,
    "item_name" TEXT NOT NULL,
    "category" TEXT,
    "sub_category" TEXT,
    "specification" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_stock_level" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "max_stock_level" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "unit_price" DECIMAL(15,2),
    "location" TEXT,
    "warehouse" TEXT NOT NULL DEFAULT 'Main Store',
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_sellable" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" SERIAL NOT NULL,
    "movement_number" TEXT NOT NULL,
    "stock_item_id" INTEGER NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(15,2),
    "total_cost" DECIMAL(15,2),
    "balance_before" DOUBLE PRECISION,
    "balance_after" DOUBLE PRECISION,
    "is_received" BOOLEAN DEFAULT false,
    "received_at" TIMESTAMP(3),
    "received_by" TEXT,
    "department" TEXT,
    "issued_to" TEXT,
    "performed_by" TEXT,
    "performed_by_id" INTEGER,
    "approved_by" TEXT,
    "approved_by_id" INTEGER,
    "reference" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "request_id" INTEGER,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" SERIAL NOT NULL,
    "adjustment_number" TEXT NOT NULL,
    "stock_item_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "system_quantity" DOUBLE PRECISION NOT NULL,
    "physical_quantity" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "approved_by" TEXT,
    "approved_by_id" INTEGER,
    "performed_by" TEXT,
    "performed_by_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "unit_price" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "procurement_items" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "estimated_price" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_requests" (
    "id" SERIAL NOT NULL,
    "request_number" TEXT NOT NULL,
    "department" TEXT,
    "requested_by" TEXT,
    "requested_by_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "title" TEXT,
    "urgency" TEXT DEFAULT 'normal',
    "required_by" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "item_count" INTEGER DEFAULT 0,
    "supplier_name" TEXT,
    "invoice_number" TEXT,
    "purchaser_details" JSONB,
    "imprest_number" TEXT,
    "payment_reference" TEXT,
    "payment_status" TEXT,
    "manager_approved_at" TIMESTAMP(3),
    "manager_notes" TEXT,
    "ceo_approved_at" TIMESTAMP(3),
    "ceo_notes" TEXT,
    "procurement_notes" TEXT,
    "finance_notes" TEXT,
    "rejection_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "received_as_asset" BOOLEAN NOT NULL DEFAULT false,
    "asset_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rejection_stage" TEXT,
    "returned_at" TIMESTAMP(3),
    "returned_by" TEXT,
    "purchaser_details_at" TIMESTAMP(3),
    "purchaser_details_by" TEXT,
    "imprest_id" INTEGER,
    "imprest_generated_at" TIMESTAMP(3),
    "payment_approved_at" TIMESTAMP(3),
    "payment_approved_by" TEXT,
    "received_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "received_as_stock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "procurement_requests_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "serial_number" TEXT,
    "model" TEXT,
    "manufacturer" TEXT,
    "qr_code" TEXT,
    "purchase_date" DATE,
    "purchase_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "current_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "salvage_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "useful_life_years" INTEGER NOT NULL DEFAULT 5,
    "depreciation_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "location" TEXT,
    "department" TEXT,
    "custodian_name" TEXT,
    "custodian_id" INTEGER,
    "condition" TEXT NOT NULL DEFAULT 'Good',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "warranty_expiry" DATE,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "notes" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "procurement_request_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'routine',
    "description" TEXT NOT NULL,
    "cost" DECIMAL(15,2),
    "performed_by" TEXT,
    "scheduled_date" DATE,
    "completed_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "next_due_date" DATE,
    "notes" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "created_by_id" INTEGER NOT NULL,
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_logs" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "opening_value" DECIMAL(15,2) NOT NULL,
    "depreciation" DECIMAL(15,2) NOT NULL,
    "closing_value" DECIMAL(15,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'straight-line',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_by" TEXT NOT NULL,

    CONSTRAINT "asset_depreciation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_imprests" (
    "id" SERIAL NOT NULL,
    "imprest_number" TEXT NOT NULL,
    "request_id" INTEGER NOT NULL,
    "request_number" TEXT NOT NULL,
    "department" TEXT,
    "requested_by" TEXT,
    "title" TEXT,
    "items" JSONB,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "approved_by_ceo" TEXT,
    "approved_by_ceo_id" INTEGER,
    "qr_code_data" TEXT,
    "pdf_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_imprests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_status_history" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_id" INTEGER,
    "changed_by_role" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenders" (
    "id" SERIAL NOT NULL,
    "tender_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_name" TEXT,
    "category" TEXT,
    "location" TEXT,
    "published_date" TIMESTAMP(3),
    "submission_date" TIMESTAMP(3),
    "awarded_date" TIMESTAMP(3),
    "estimated_budget" DECIMAL(15,2),
    "awarded_amount" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'incoming',
    "documents" JSONB DEFAULT '[]',
    "procurement_id" INTEGER,
    "created_by_id" INTEGER,
    "created_by_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_key_key" ON "site_content"("key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_receipt_number_key" ON "orders"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_id_key" ON "employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_id_key" ON "contracts"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_payroll_id_key" ON "payrolls"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_resources_resource_id_key" ON "financial_resources"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_resources_account_id_key" ON "financial_resources"("account_id");

-- CreateIndex
CREATE INDEX "financial_resources_status_idx" ON "financial_resources"("status");

-- CreateIndex
CREATE INDEX "financial_resources_category_idx" ON "financial_resources"("category");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_id_key" ON "transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "transactions_resource_id_idx" ON "transactions"("resource_id");

-- CreateIndex
CREATE INDEX "transactions_source_idx" ON "transactions"("source");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_payments_reference_key" ON "company_payments"("reference");

-- CreateIndex
CREATE INDEX "company_payments_status_idx" ON "company_payments"("status");

-- CreateIndex
CREATE INDEX "company_payments_type_idx" ON "company_payments"("type");

-- CreateIndex
CREATE INDEX "company_payments_created_at_idx" ON "company_payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_transfer_id_key" ON "fund_transfers"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_notice_id_key" ON "fund_transfers"("notice_id");

-- CreateIndex
CREATE INDEX "fund_transfers_status_idx" ON "fund_transfers"("status");

-- CreateIndex
CREATE INDEX "fund_transfers_from_account_id_idx" ON "fund_transfers"("from_account_id");

-- CreateIndex
CREATE INDEX "fund_transfers_to_account_id_idx" ON "fund_transfers"("to_account_id");

-- CreateIndex
CREATE INDEX "fund_transfers_created_at_idx" ON "fund_transfers"("created_at");

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
CREATE UNIQUE INDEX "production_batches_qc_notice_no_key" ON "production_batches"("qc_notice_no");

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

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_item_code_key" ON "stock_items"("item_code");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_items_status_idx" ON "stock_items"("status");

-- CreateIndex
CREATE INDEX "stock_items_item_code_idx" ON "stock_items"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_item_name_specification_key" ON "stock_items"("item_name", "specification");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transactions_movement_number_key" ON "stock_transactions"("movement_number");

-- CreateIndex
CREATE INDEX "stock_transactions_stock_item_id_idx" ON "stock_transactions"("stock_item_id");

-- CreateIndex
CREATE INDEX "stock_transactions_request_id_idx" ON "stock_transactions"("request_id");

-- CreateIndex
CREATE INDEX "stock_transactions_transaction_type_idx" ON "stock_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "stock_transactions_created_at_idx" ON "stock_transactions"("created_at");

-- CreateIndex
CREATE INDEX "stock_transactions_department_idx" ON "stock_transactions"("department");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_adjustment_number_key" ON "stock_adjustments"("adjustment_number");

-- CreateIndex
CREATE INDEX "stock_adjustments_stock_item_id_idx" ON "stock_adjustments"("stock_item_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_created_at_idx" ON "stock_adjustments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_email_key" ON "suppliers"("name", "email");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "purchase_orders"("order_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "procurement_items_request_id_idx" ON "procurement_items"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_requests_request_number_key" ON "procurement_requests"("request_number");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_requests_asset_id_key" ON "procurement_requests"("asset_id");

-- CreateIndex
CREATE INDEX "procurement_requests_status_idx" ON "procurement_requests"("status");

-- CreateIndex
CREATE INDEX "procurement_requests_requested_by_id_idx" ON "procurement_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "procurement_requests_department_idx" ON "procurement_requests"("department");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");

-- CreateIndex
CREATE UNIQUE INDEX "assets_procurement_request_id_key" ON "assets"("procurement_request_id");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_location_idx" ON "assets"("location");

-- CreateIndex
CREATE INDEX "assets_created_by_id_idx" ON "assets"("created_by_id");

-- CreateIndex
CREATE INDEX "asset_maintenance_asset_id_idx" ON "asset_maintenance"("asset_id");

-- CreateIndex
CREATE INDEX "asset_maintenance_status_idx" ON "asset_maintenance"("status");

-- CreateIndex
CREATE INDEX "asset_depreciation_logs_asset_id_idx" ON "asset_depreciation_logs"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciation_logs_asset_id_year_key" ON "asset_depreciation_logs"("asset_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_imprests_imprest_number_key" ON "procurement_imprests"("imprest_number");

-- CreateIndex
CREATE INDEX "procurement_imprests_request_id_idx" ON "procurement_imprests"("request_id");

-- CreateIndex
CREATE INDEX "procurement_status_history_request_id_idx" ON "procurement_status_history"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenders_tender_number_key" ON "tenders"("tender_number");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketing_plan_id_fkey" FOREIGN KEY ("marketing_plan_id") REFERENCES "marketing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "company_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_verified_by_fkey" FOREIGN KEY ("payment_verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_postpaid_approved_by_fkey" FOREIGN KEY ("postpaid_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_receipt_issued_by_fkey" FOREIGN KEY ("receipt_issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_reviewed_by_sales_fkey" FOREIGN KEY ("reviewed_by_sales") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_sent" ADD CONSTRAINT "reports_sent_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_accounts" ADD CONSTRAINT "company_accounts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_accounts" ADD CONSTRAINT "company_accounts_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_activities" ADD CONSTRAINT "marketing_activities_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_activities" ADD CONSTRAINT "marketing_activities_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_activities" ADD CONSTRAINT "marketing_activities_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "marketing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_research" ADD CONSTRAINT "market_research_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_resources" ADD CONSTRAINT "financial_resources_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "company_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "financial_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "company_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "company_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_qc_checked_by_fkey" FOREIGN KEY ("qc_checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_usages" ADD CONSTRAINT "production_usages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_usages" ADD CONSTRAINT "production_usages_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "procurement_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_logs" ADD CONSTRAINT "asset_depreciation_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
