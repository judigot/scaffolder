-- ============================================================================
-- COMPREHENSIVE POSTGRESQL SCHEMA FOR INTROSPECTION TESTING
-- ============================================================================
-- PostgreSQL 16+ compatible schema using latest syntax and best practices
-- This schema includes ALL PostgreSQL database objects for testing introspection:
-- - Tables (regular, partitioned, foreign)
-- - Views (regular, materialized, security invoker)
-- - Functions, Procedures, Aggregates
-- - Types (composite, enum, domain, range)
-- - Sequences
-- - Indexes (B-tree, GIN, GiST, Hash, BRIN)
-- - Triggers
-- - Rules
-- - Constraints (PK, FK, Unique, Check, Exclusion)
-- - Row Level Security (RLS) Policies
-- - Comments
-- - Extensions
-- - Schemas
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
/* Note: uuid-ossp is no longer needed - using built-in gen_random_uuid() */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  /* Required for exclusion constraints */
CREATE EXTENSION IF NOT EXISTS "hstore";

-- ============================================================================
-- 2. CUSTOM SCHEMAS
-- ============================================================================
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS archive CASCADE;
CREATE SCHEMA audit;
CREATE SCHEMA archive;

-- ============================================================================
-- 3. CUSTOM TYPES - ENUMS
-- ============================================================================
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS priority_level CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;

CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user', 'guest');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto');

-- ============================================================================
-- 4. CUSTOM TYPES - COMPOSITE
-- ============================================================================
DROP TYPE IF EXISTS address_type CASCADE;
DROP TYPE IF EXISTS money_with_currency CASCADE;
DROP TYPE IF EXISTS geolocation CASCADE;

CREATE TYPE address_type AS (
    street TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT
);

CREATE TYPE money_with_currency AS (
    amount NUMERIC(15, 2),
    currency CHAR(3)
);

CREATE TYPE geolocation AS (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

-- ============================================================================
-- 5. CUSTOM TYPES - DOMAINS
-- ============================================================================
DROP DOMAIN IF EXISTS email_domain CASCADE;
DROP DOMAIN IF EXISTS positive_integer CASCADE;
DROP DOMAIN IF EXISTS percentage CASCADE;
DROP DOMAIN IF EXISTS phone_number CASCADE;

CREATE DOMAIN email_domain AS VARCHAR(255)
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN positive_integer AS INTEGER
    CHECK (VALUE > 0);

CREATE DOMAIN percentage AS NUMERIC(5, 2)
    CHECK (VALUE >= 0 AND VALUE <= 100);

CREATE DOMAIN phone_number AS VARCHAR(20)
    CHECK (VALUE ~* '^\+?[0-9\s\-\(\)]+$');

-- ============================================================================
-- 6. CUSTOM TYPES - RANGE
-- ============================================================================
DROP TYPE IF EXISTS float_range CASCADE;

CREATE TYPE float_range AS RANGE (
    SUBTYPE = FLOAT8
);

-- ============================================================================
-- 7. SEQUENCES (Standalone)
-- ============================================================================
DROP SEQUENCE IF EXISTS invoice_number_seq;
DROP SEQUENCE IF EXISTS ticket_number_seq;

CREATE SEQUENCE invoice_number_seq
    AS BIGINT
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 9999999
    CYCLE
    CACHE 10;

CREATE SEQUENCE ticket_number_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO CYCLE
    CACHE 1;

-- ============================================================================
-- 8. DROP EXISTING TABLES (Clean slate)
-- ============================================================================
DROP TABLE IF EXISTS audit.audit_log CASCADE;
DROP TABLE IF EXISTS archive.archived_orders CASCADE;
DROP TABLE IF EXISTS "posts" CASCADE;
DROP TABLE IF EXISTS "profile" CASCADE;
DROP TABLE IF EXISTS "user_sessions" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "order_product" CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS "customer_addresses" CASCADE;
DROP TABLE IF EXISTS "customer" CASCADE;
DROP TABLE IF EXISTS "product_tags" CASCADE;
DROP TABLE IF EXISTS "tag" CASCADE;
DROP TABLE IF EXISTS "product_inventory" CASCADE;
DROP TABLE IF EXISTS "product" CASCADE;
DROP TABLE IF EXISTS "category" CASCADE;
DROP TABLE IF EXISTS "audit_log" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "room_reservations" CASCADE;
DROP TABLE IF EXISTS "meeting_rooms" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "sales_2024_q1" CASCADE;
DROP TABLE IF EXISTS "sales_2024_q2" CASCADE;
DROP TABLE IF EXISTS "sales_2024_q3" CASCADE;
DROP TABLE IF EXISTS "sales_2024_q4" CASCADE;
DROP TABLE IF EXISTS "sales" CASCADE;

-- ============================================================================
-- 9. TABLES - Using SQL standard IDENTITY columns (PostgreSQL 10+)
-- ============================================================================

/* Category table - Self-referencing for hierarchical data */
CREATE TABLE "category" (
    "category_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "parent_id" BIGINT,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_category_parent" FOREIGN KEY ("parent_id") REFERENCES "category" ("category_id") ON DELETE SET NULL
);

/* Product table - Various data types and constraints */
CREATE TABLE "product" (
    "product_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "uuid" UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "sku" VARCHAR(50) UNIQUE NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" BIGINT,
    "price" NUMERIC(10, 2) NOT NULL CHECK ("price" >= 0),
    "cost" NUMERIC(10, 2) CHECK ("cost" >= 0),
    "weight_kg" REAL,
    "dimensions" JSONB,  /* {"length": 10, "width": 5, "height": 3} */
    "tags" TEXT[],
    "attributes" HSTORE,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "is_featured" BOOLEAN DEFAULT FALSE,
    "rating" NUMERIC(3, 2) CHECK ("rating" >= 0 AND "rating" <= 5),
    "review_count" INTEGER DEFAULT 0 CHECK ("review_count" >= 0),
    "manufacturer" TEXT,
    "release_date" DATE,
    "warranty_months" SMALLINT CHECK ("warranty_months" >= 0),
    "barcode" BYTEA,
    "search_vector" TSVECTOR,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "FK_product_category" FOREIGN KEY ("category_id") REFERENCES "category" ("category_id") ON DELETE SET NULL,
    CONSTRAINT "CHK_product_price_gt_cost" CHECK ("price" > "cost" OR "cost" IS NULL)
);

/* Product inventory - Composite primary key */
CREATE TABLE "product_inventory" (
    "product_id" BIGINT NOT NULL,
    "warehouse_code" VARCHAR(10) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("reserved_quantity" >= 0),
    "reorder_level" INTEGER DEFAULT 10,
    "last_restocked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("product_id", "warehouse_code"),
    CONSTRAINT "FK_inventory_product" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
    CONSTRAINT "CHK_reserved_lte_quantity" CHECK ("reserved_quantity" <= "quantity")
);

/* Tag table */
CREATE TABLE "tag" (
    "tag_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "color" CHAR(7) CHECK ("color" ~* '^#[0-9A-Fa-f]{6}$'),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

/* Product-Tag junction table (Many-to-Many) */
CREATE TABLE "product_tags" (
    "product_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("product_id", "tag_id"),
    CONSTRAINT "FK_product_tags_product" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
    CONSTRAINT "FK_product_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("tag_id") ON DELETE CASCADE
);

/* Customer table - Using custom types */
CREATE TABLE "customer" (
    "customer_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "uuid" UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "email" email_domain UNIQUE NOT NULL,
    "phone" phone_number,
    "role" user_role DEFAULT 'user' NOT NULL,
    "loyalty_points" positive_integer DEFAULT 1,
    "discount_percentage" percentage DEFAULT 0,
    "preferred_payment" payment_method,
    "notes" TEXT,
    "is_verified" BOOLEAN DEFAULT FALSE NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "login_count" INTEGER DEFAULT 0 CHECK ("login_count" >= 0),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

/* Customer addresses - Using composite type */
CREATE TABLE "customer_addresses" (
    "address_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "customer_id" BIGINT NOT NULL,
    "label" VARCHAR(50) DEFAULT 'Home',
    "address" address_type NOT NULL,
    "location" geolocation,
    "is_default" BOOLEAN DEFAULT FALSE NOT NULL,
    "is_billing" BOOLEAN DEFAULT FALSE,
    "is_shipping" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_address_customer" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE
);

/* Order table - Using enum and custom types */
CREATE TABLE "order" (
    "order_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "order_number" VARCHAR(20) UNIQUE NOT NULL DEFAULT 'ORD-' || nextval('invoice_number_seq'),
    "customer_id" BIGINT NOT NULL,
    "status" order_status DEFAULT 'pending' NOT NULL,
    "priority" priority_level DEFAULT 'medium',
    "shipping_address" address_type,
    "billing_address" address_type,
    "subtotal" money_with_currency,
    "tax_amount" NUMERIC(10, 2) DEFAULT 0 CHECK ("tax_amount" >= 0),
    "shipping_cost" NUMERIC(10, 2) DEFAULT 0 CHECK ("shipping_cost" >= 0),
    "discount_amount" NUMERIC(10, 2) DEFAULT 0 CHECK ("discount_amount" >= 0),
    "total_amount" NUMERIC(10, 2) NOT NULL CHECK ("total_amount" >= 0),
    "currency" CHAR(3) DEFAULT 'USD' NOT NULL,
    "payment_method" payment_method,
    "paid_at" TIMESTAMPTZ,
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "FK_order_customer" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id")
);

/* Order-Product junction table with GENERATED ALWAYS AS computed column */
CREATE TABLE "order_product" (
    "order_product_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "order_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit_price" NUMERIC(10, 2) NOT NULL CHECK ("unit_price" >= 0),
    "discount" NUMERIC(10, 2) DEFAULT 0 CHECK ("discount" >= 0),
    "total_price" NUMERIC(10, 2) GENERATED ALWAYS AS (("quantity" * "unit_price") - "discount") STORED,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_order_product_order" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE,
    CONSTRAINT "FK_order_product_product" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id"),
    CONSTRAINT "UQ_order_product" UNIQUE ("order_id", "product_id")
);

/* User table - GENERATED ALWAYS for strict identity */
CREATE TABLE "user" (
    "user_id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "uuid" UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT GENERATED ALWAYS AS ("first_name" || ' ' || "last_name") STORED,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "username" TEXT UNIQUE NOT NULL,
    "password" CHAR(60) NOT NULL,
    "password_salt" BYTEA,
    "role" user_role DEFAULT 'user' NOT NULL,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "is_verified" BOOLEAN DEFAULT FALSE NOT NULL,
    "two_factor_enabled" BOOLEAN DEFAULT FALSE,
    "two_factor_secret" TEXT,
    "avatar_url" TEXT,
    "timezone" VARCHAR(50) DEFAULT 'UTC',
    "locale" VARCHAR(10) DEFAULT 'en-US',
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" INET,
    "failed_login_attempts" SMALLINT DEFAULT 0 CHECK ("failed_login_attempts" >= 0),
    "locked_until" TIMESTAMPTZ,
    "password_changed_at" TIMESTAMPTZ,
    "email_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "CHK_user_email_format" CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

/* User sessions - UUID primary key */
CREATE TABLE "user_sessions" (
    "session_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" BIGINT NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "last_activity_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_session_user" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE
);

/* Profile table - One-to-One with User */
CREATE TABLE "profile" (
    "profile_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "user_id" BIGINT UNIQUE NOT NULL,
    "bio" TEXT,
    "website" TEXT,
    "location" TEXT,
    "birthdate" DATE,
    "gender" VARCHAR(20),
    "social_links" JSONB DEFAULT '{}',
    "preferences" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_profile_user" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE
);

/* Posts table - One-to-Many with User */
CREATE TABLE "posts" (
    "post_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "uuid" UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "featured_image" TEXT,
    "status" VARCHAR(20) DEFAULT 'draft' CHECK ("status" IN ('draft', 'published', 'archived')),
    "is_featured" BOOLEAN DEFAULT FALSE,
    "view_count" INTEGER DEFAULT 0 CHECK ("view_count" >= 0),
    "like_count" INTEGER DEFAULT 0 CHECK ("like_count" >= 0),
    "comment_count" INTEGER DEFAULT 0 CHECK ("comment_count" >= 0),
    "search_vector" TSVECTOR,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "FK_posts_user" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE
);

/* Settings table - Key-Value store */
CREATE TABLE "settings" (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN DEFAULT FALSE NOT NULL,
    "is_readonly" BOOLEAN DEFAULT FALSE NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

/* Notifications table */
CREATE TABLE "notifications" (
    "notification_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB DEFAULT '{}',
    "is_read" BOOLEAN DEFAULT FALSE NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_notification_user" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE
);

/* Meeting rooms - For exclusion constraint demo */
CREATE TABLE "meeting_rooms" (
    "room_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
    "floor" SMALLINT,
    "has_projector" BOOLEAN DEFAULT FALSE,
    "has_video_conference" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

/* Room reservations - With exclusion constraint to prevent overlapping bookings */
CREATE TABLE "room_reservations" (
    "reservation_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "room_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "is_recurring" BOOLEAN DEFAULT FALSE,
    "recurrence_pattern" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "FK_reservation_room" FOREIGN KEY ("room_id") REFERENCES "meeting_rooms" ("room_id") ON DELETE CASCADE,
    CONSTRAINT "FK_reservation_user" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE,
    CONSTRAINT "CHK_reservation_time" CHECK ("end_time" > "start_time"),
    /* Exclusion constraint - prevents overlapping reservations for same room */
    CONSTRAINT "EX_no_overlapping_reservations" EXCLUDE USING GIST (
        "room_id" WITH =,
        tstzrange("start_time", "end_time") WITH &&
    )
);

/* Events table - Date range type */
CREATE TABLE "events" (
    "event_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_range" TSTZRANGE NOT NULL,
    "location" TEXT,
    "max_attendees" INTEGER,
    "is_public" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

/* Audit log table in audit schema */
CREATE TABLE audit.audit_log (
    "log_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "table_name" TEXT NOT NULL,
    "record_id" BIGINT NOT NULL,
    "action" VARCHAR(10) NOT NULL CHECK ("action" IN ('INSERT', 'UPDATE', 'DELETE', 'MERGE')),
    "old_data" JSONB,
    "new_data" JSONB,
    "changed_fields" TEXT[],
    "user_id" BIGINT,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

/* Archived orders in archive schema */
CREATE TABLE archive.archived_orders (
    "archive_id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "original_order_id" BIGINT NOT NULL,
    "order_data" JSONB NOT NULL,
    "archived_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "archived_by" BIGINT,
    "reason" TEXT
);

-- ============================================================================
-- 10. PARTITIONED TABLES (PostgreSQL 10+)
-- ============================================================================

/* Sales table - Partitioned by date range */
CREATE TABLE "sales" (
    "sale_id" BIGINT GENERATED BY DEFAULT AS IDENTITY,
    "product_id" BIGINT NOT NULL,
    "customer_id" BIGINT,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit_price" NUMERIC(10, 2) NOT NULL,
    "total_amount" NUMERIC(10, 2) GENERATED ALWAYS AS ("quantity" * "unit_price") STORED,
    "sale_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("sale_id", "sale_date")
) PARTITION BY RANGE ("sale_date");

/* Partition tables for each quarter */
CREATE TABLE "sales_2024_q1" PARTITION OF "sales"
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE "sales_2024_q2" PARTITION OF "sales"
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE "sales_2024_q3" PARTITION OF "sales"
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE "sales_2024_q4" PARTITION OF "sales"
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- ============================================================================
-- 11. INDEXES - Various types
-- ============================================================================

/* B-tree indexes (default) */
CREATE INDEX "IDX_product_category" ON "product" ("category_id");
CREATE INDEX "IDX_product_price" ON "product" ("price");
CREATE INDEX "IDX_product_created_at" ON "product" ("created_at" DESC NULLS LAST);
CREATE INDEX "IDX_order_customer" ON "order" ("customer_id");
CREATE INDEX "IDX_order_status" ON "order" ("status");
CREATE INDEX "IDX_order_created_at" ON "order" ("created_at" DESC NULLS LAST);
CREATE INDEX "IDX_posts_user" ON "posts" ("user_id");
CREATE INDEX "IDX_posts_status" ON "posts" ("status") WHERE "deleted_at" IS NULL;

/* Unique indexes */
CREATE UNIQUE INDEX "UQ_product_sku_active" ON "product" ("sku") WHERE "deleted_at" IS NULL;

/* Composite indexes */
CREATE INDEX "IDX_order_customer_status" ON "order" ("customer_id", "status");
CREATE INDEX "IDX_inventory_product_warehouse" ON "product_inventory" ("product_id", "warehouse_code");

/* Partial indexes (conditional) */
CREATE INDEX "IDX_product_active" ON "product" ("product_id") WHERE "is_active" = TRUE AND "deleted_at" IS NULL;
CREATE INDEX "IDX_order_pending" ON "order" ("order_id") WHERE "status" = 'pending';
CREATE INDEX "IDX_user_active" ON "user" ("user_id") WHERE "is_active" = TRUE AND "deleted_at" IS NULL;

/* GIN indexes (for arrays, JSONB, full-text) */
CREATE INDEX "IDX_product_tags_gin" ON "product" USING GIN ("tags");
CREATE INDEX "IDX_product_attributes_gin" ON "product" USING GIN ("attributes");
CREATE INDEX "IDX_product_dimensions_gin" ON "product" USING GIN ("dimensions" jsonb_path_ops);
CREATE INDEX "IDX_order_metadata_gin" ON "order" USING GIN ("metadata" jsonb_path_ops);
CREATE INDEX "IDX_product_search" ON "product" USING GIN ("search_vector");
CREATE INDEX "IDX_posts_search" ON "posts" USING GIN ("search_vector");

/* GiST indexes (for geometric, range, full-text) */
CREATE INDEX "IDX_events_range_gist" ON "events" USING GIST ("event_range");

/* Hash indexes (for equality comparisons only - PostgreSQL 10+ WAL-logged) */
CREATE INDEX "IDX_customer_email_hash" ON "customer" USING HASH ("email");

/* BRIN indexes (for large tables with naturally ordered data) */
CREATE INDEX "IDX_audit_created_at_brin" ON audit.audit_log USING BRIN ("created_at") WITH (pages_per_range = 128);

/* Expression indexes */
CREATE INDEX "IDX_user_email_lower" ON "user" (LOWER("email"));
CREATE INDEX "IDX_product_name_lower" ON "product" (LOWER("product_name") text_pattern_ops);

/* Include columns (covering index - PostgreSQL 11+) */
CREATE INDEX "IDX_order_status_include" ON "order" ("status") INCLUDE ("customer_id", "total_amount");

/* NULLS NOT DISTINCT unique index (PostgreSQL 15+) */
CREATE UNIQUE INDEX "UQ_customer_phone" ON "customer" ("phone") NULLS NOT DISTINCT;

-- ============================================================================
-- 12. VIEWS - Regular (with security_invoker for PostgreSQL 15+)
-- ============================================================================

/* Active products view - Security invoker (PostgreSQL 15+) */
CREATE OR REPLACE VIEW "v_active_products" 
WITH (security_invoker = true) AS
SELECT 
    p.product_id,
    p.uuid,
    p.sku,
    p.product_name,
    p.description,
    c.name AS category_name,
    p.price,
    p.rating,
    p.review_count,
    p.tags,
    p.created_at
FROM "product" p
LEFT JOIN "category" c ON p.category_id = c.category_id
WHERE p.is_active = TRUE AND p.deleted_at IS NULL;

/* Customer orders summary view */
CREATE OR REPLACE VIEW "v_customer_orders" 
WITH (security_invoker = true) AS
SELECT 
    c.customer_id,
    c.name AS customer_name,
    c.email,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
    MAX(o.created_at) AS last_order_at,
    c.loyalty_points,
    c.role
FROM "customer" c
LEFT JOIN "order" o ON c.customer_id = o.customer_id AND o.deleted_at IS NULL
GROUP BY c.customer_id, c.name, c.email, c.loyalty_points, c.role;

/* Order details view with line items */
CREATE OR REPLACE VIEW "v_order_details" 
WITH (security_invoker = true) AS
SELECT 
    o.order_id,
    o.order_number,
    c.name AS customer_name,
    c.email AS customer_email,
    o.status,
    o.priority,
    p.product_name,
    op.quantity,
    op.unit_price,
    op.total_price,
    o.total_amount AS order_total,
    o.created_at AS order_date
FROM "order" o
JOIN "customer" c ON o.customer_id = c.customer_id
JOIN "order_product" op ON o.order_id = op.order_id
JOIN "product" p ON op.product_id = p.product_id
WHERE o.deleted_at IS NULL;

/* User activity view */
CREATE OR REPLACE VIEW "v_user_activity" 
WITH (security_invoker = true) AS
SELECT 
    u.user_id,
    u.uuid,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.is_verified,
    COUNT(DISTINCT p.post_id) AS post_count,
    COUNT(DISTINCT s.session_id) AS active_sessions,
    u.last_login_at,
    u.created_at
FROM "user" u
LEFT JOIN "posts" p ON u.user_id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN "user_sessions" s ON u.user_id = s.user_id AND s.is_active = TRUE
WHERE u.deleted_at IS NULL
GROUP BY u.user_id, u.uuid, u.username, u.email, u.full_name, 
         u.role, u.is_active, u.is_verified, u.last_login_at, u.created_at;

/* Inventory status view */
CREATE OR REPLACE VIEW "v_inventory_status" 
WITH (security_invoker = true) AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    pi.warehouse_code,
    pi.quantity,
    pi.reserved_quantity,
    (pi.quantity - pi.reserved_quantity) AS available_quantity,
    pi.reorder_level,
    CASE 
        WHEN (pi.quantity - pi.reserved_quantity) <= 0 THEN 'Out of Stock'
        WHEN (pi.quantity - pi.reserved_quantity) <= pi.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    pi.last_restocked_at
FROM "product" p
JOIN "product_inventory" pi ON p.product_id = pi.product_id
WHERE p.deleted_at IS NULL;

/* JSON view using modern JSON functions (PostgreSQL 16+) */
CREATE OR REPLACE VIEW "v_product_json" 
WITH (security_invoker = true) AS
SELECT 
    p.product_id,
    json_object(
        'id': p.product_id,
        'uuid': p.uuid,
        'name': p.product_name,
        'sku': p.sku,
        'price': p.price,
        'category': c.name,
        'tags': p.tags,
        'rating': p.rating
    ) AS product_data
FROM "product" p
LEFT JOIN "category" c ON p.category_id = c.category_id
WHERE p.deleted_at IS NULL;

-- ============================================================================
-- 13. MATERIALIZED VIEWS
-- ============================================================================

/* Daily sales summary - Materialized for performance */
CREATE MATERIALIZED VIEW "mv_daily_sales_summary" AS
SELECT 
    s.sale_date,
    COUNT(*) AS total_sales,
    SUM(s.quantity) AS total_quantity,
    SUM(s.total_amount) AS total_revenue,
    AVG(s.total_amount) AS avg_sale_value,
    COUNT(DISTINCT s.customer_id) AS unique_customers,
    COUNT(DISTINCT s.product_id) AS unique_products
FROM "sales" s
GROUP BY s.sale_date
ORDER BY s.sale_date DESC
WITH DATA;

/* Product performance - Materialized */
CREATE MATERIALIZED VIEW "mv_product_performance" AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    c.name AS category_name,
    COALESCE(SUM(op.quantity), 0) AS total_sold,
    COALESCE(SUM(op.total_price), 0) AS total_revenue,
    COUNT(DISTINCT op.order_id) AS order_count,
    p.rating,
    p.review_count
FROM "product" p
LEFT JOIN "category" c ON p.category_id = c.category_id
LEFT JOIN "order_product" op ON p.product_id = op.product_id
LEFT JOIN "order" o ON op.order_id = o.order_id AND o.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.product_id, p.sku, p.product_name, c.name, p.rating, p.review_count
WITH DATA;

/* Create unique index on materialized view for REFRESH CONCURRENTLY */
CREATE UNIQUE INDEX "IDX_mv_daily_sales_date" ON "mv_daily_sales_summary" ("sale_date");
CREATE UNIQUE INDEX "IDX_mv_product_performance_id" ON "mv_product_performance" ("product_id");

-- ============================================================================
-- 14. FUNCTIONS (with modern syntax)
-- ============================================================================

/* Scalar function - Calculate discount */
CREATE OR REPLACE FUNCTION calculate_discount(
    p_price NUMERIC,
    p_discount_percentage NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
BEGIN
    IF p_discount_percentage <= 0 THEN
        RETURN p_price;
    END IF;
    RETURN ROUND(p_price * (1 - p_discount_percentage / 100), 2);
END;
$$;

/* Scalar function - Generate slug */
CREATE OR REPLACE FUNCTION generate_slug(p_text TEXT) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRIM(p_text),
                '[^a-zA-Z0-9\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
        )
    );
END;
$$;

/* SQL function (pure SQL, better optimization) */
CREATE OR REPLACE FUNCTION get_customer_order_count(p_customer_id BIGINT) 
RETURNS BIGINT
LANGUAGE sql
STABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
    SELECT COUNT(*) FROM "order" WHERE customer_id = p_customer_id AND deleted_at IS NULL;
$$;

/* Table function - Get customer orders */
CREATE OR REPLACE FUNCTION get_customer_orders(p_customer_id BIGINT)
RETURNS TABLE (
    order_id BIGINT,
    order_number VARCHAR(20),
    status order_status,
    total_amount NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    SELECT o.order_id, o.order_number, o.status, o.total_amount, o.created_at
    FROM "order" o
    WHERE o.customer_id = p_customer_id AND o.deleted_at IS NULL
    ORDER BY o.created_at DESC;
END;
$$;

/* Set-returning function - Generate date series */
CREATE OR REPLACE FUNCTION generate_date_range(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF DATE
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)::DATE;
$$;

/* Function with OUT parameters */
CREATE OR REPLACE FUNCTION get_product_stats(
    p_product_id BIGINT,
    OUT total_sold INTEGER,
    OUT total_revenue NUMERIC,
    OUT avg_price NUMERIC
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    SELECT 
        COALESCE(SUM(op.quantity), 0)::INTEGER,
        COALESCE(SUM(op.total_price), 0),
        COALESCE(AVG(op.unit_price), 0)
    INTO total_sold, total_revenue, avg_price
    FROM "order_product" op
    JOIN "order" o ON op.order_id = o.order_id
    WHERE op.product_id = p_product_id AND o.deleted_at IS NULL;
END;
$$;

/* Function returning composite type */
CREATE OR REPLACE FUNCTION get_address_from_customer(p_customer_id BIGINT)
RETURNS address_type
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_address address_type;
BEGIN
    SELECT (ca.address).*
    INTO v_address
    FROM "customer_addresses" ca
    WHERE ca.customer_id = p_customer_id AND ca.is_default = TRUE
    LIMIT 1;
    
    RETURN v_address;
END;
$$;

/* Function with VARIADIC parameters */
CREATE OR REPLACE FUNCTION array_contains_any(
    p_array TEXT[],
    VARIADIC p_values TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT p_array && p_values;
$$;

/* Security definer function */
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE (
    user_id BIGINT,
    username TEXT,
    email VARCHAR(255),
    role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.username, u.email, u.role
    FROM "user" u
    WHERE u.username = p_username 
      AND u.password = crypt(p_password, u.password)
      AND u.is_active = TRUE 
      AND u.deleted_at IS NULL;
END;
$$;

/* Trigger function - Update timestamp */
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

/* Trigger function - Audit log */
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.user_id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.user_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.user_id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

/* Trigger function - Update search vector */
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('english', COALESCE(NEW.product_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.manufacturer, '')), 'C');
    RETURN NEW;
END;
$$;

/* Trigger function - Update post search vector */
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 15. PROCEDURES (PostgreSQL 11+)
-- ============================================================================

/* Procedure - Process order */
CREATE OR REPLACE PROCEDURE process_order(
    p_order_id BIGINT,
    INOUT p_success BOOLEAN DEFAULT FALSE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status order_status;
BEGIN
    SELECT status INTO v_status FROM "order" WHERE order_id = p_order_id;
    
    IF v_status = 'pending' THEN
        UPDATE "order" SET status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE order_id = p_order_id;
        p_success := TRUE;
    ELSE
        p_success := FALSE;
    END IF;
    
    COMMIT;
END;
$$;

/* Procedure - Archive old orders */
CREATE OR REPLACE PROCEDURE archive_old_orders(
    p_days_old INTEGER DEFAULT 365
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ;
    v_archived_count INTEGER := 0;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - make_interval(days => p_days_old);
    
    INSERT INTO archive.archived_orders (original_order_id, order_data, reason)
    SELECT order_id, to_jsonb(o.*), format('Auto-archived after %s days', p_days_old)
    FROM "order" o
    WHERE o.created_at < v_cutoff_date 
      AND o.status IN ('delivered', 'cancelled', 'refunded');
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    DELETE FROM "order" 
    WHERE created_at < v_cutoff_date 
      AND status IN ('delivered', 'cancelled', 'refunded');
    
    COMMIT;
    
    RAISE NOTICE 'Archived % orders', v_archived_count;
END;
$$;

/* Procedure - Refresh materialized views */
CREATE OR REPLACE PROCEDURE refresh_all_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_daily_sales_summary";
    REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_product_performance";
    COMMIT;
END;
$$;

/* Procedure using MERGE (PostgreSQL 15+) */
CREATE OR REPLACE PROCEDURE upsert_product_inventory(
    p_product_id BIGINT,
    p_warehouse_code VARCHAR(10),
    p_quantity INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    MERGE INTO "product_inventory" AS target
    USING (SELECT p_product_id AS product_id, p_warehouse_code AS warehouse_code, p_quantity AS quantity) AS source
    ON target.product_id = source.product_id AND target.warehouse_code = source.warehouse_code
    WHEN MATCHED THEN
        UPDATE SET 
            quantity = target.quantity + source.quantity,
            last_restocked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
        INSERT (product_id, warehouse_code, quantity, created_at, updated_at)
        VALUES (source.product_id, source.warehouse_code, source.quantity, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    COMMIT;
END;
$$;

-- ============================================================================
-- 16. AGGREGATES
-- ============================================================================

/* Custom aggregate - Concatenate with separator */
CREATE OR REPLACE FUNCTION concat_agg_sfunc(state TEXT, value TEXT, separator TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT CASE WHEN state IS NULL THEN value ELSE state || separator || value END;
$$;

CREATE OR REPLACE AGGREGATE string_agg_custom(TEXT, TEXT) (
    SFUNC = concat_agg_sfunc,
    STYPE = TEXT,
    PARALLEL = SAFE
);

-- ============================================================================
-- 17. TRIGGERS
-- ============================================================================

/* Update timestamp triggers */
CREATE TRIGGER "TR_product_updated_at"
    BEFORE UPDATE ON "product"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "TR_customer_updated_at"
    BEFORE UPDATE ON "customer"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "TR_order_updated_at"
    BEFORE UPDATE ON "order"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "TR_user_updated_at"
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "TR_profile_updated_at"
    BEFORE UPDATE ON "profile"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "TR_posts_updated_at"
    BEFORE UPDATE ON "posts"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

/* Audit triggers */
CREATE TRIGGER "TR_user_audit"
    AFTER INSERT OR UPDATE OR DELETE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();

/* Search vector triggers */
CREATE TRIGGER "TR_product_search_vector"
    BEFORE INSERT OR UPDATE OF product_name, description, manufacturer ON "product"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();

CREATE TRIGGER "TR_posts_search_vector"
    BEFORE INSERT OR UPDATE OF title, excerpt, content ON "posts"
    FOR EACH ROW
    EXECUTE FUNCTION update_post_search_vector();

-- ============================================================================
-- 18. RULES
-- ============================================================================

/* Rule - Redirect deletes to soft delete */
CREATE OR REPLACE RULE "RL_product_soft_delete" AS
    ON DELETE TO "product"
    DO INSTEAD
    UPDATE "product" SET deleted_at = CURRENT_TIMESTAMP WHERE product_id = OLD.product_id AND deleted_at IS NULL;

/* Rule - Log all customer updates */
CREATE OR REPLACE RULE "RL_customer_update_log" AS
    ON UPDATE TO "customer"
    DO ALSO
    INSERT INTO audit.audit_log (table_name, record_id, action, old_data, new_data)
    VALUES ('customer', NEW.customer_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));

-- ============================================================================
-- 19. ROW LEVEL SECURITY (RLS)
-- ============================================================================

/* Enable RLS on sensitive tables */
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;

/* Force RLS for table owners too (PostgreSQL 15+ best practice) */
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "posts" FORCE ROW LEVEL SECURITY;

/* Policies for user table */
CREATE POLICY "policy_user_select_own"
    ON "user"
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::BIGINT OR 
           current_setting('app.current_user_role', TRUE) = 'admin');

CREATE POLICY "policy_user_update_own"
    ON "user"
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::BIGINT)
    WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::BIGINT);

/* Policies for order table */
CREATE POLICY "policy_order_customer_access"
    ON "order"
    FOR ALL
    USING (
        customer_id IN (
            SELECT customer_id FROM "customer" 
            WHERE customer_id = current_setting('app.current_customer_id', TRUE)::BIGINT
        ) OR current_setting('app.current_user_role', TRUE) IN ('admin', 'moderator')
    );

/* Policies for posts table */
CREATE POLICY "policy_posts_public_read"
    ON "posts"
    FOR SELECT
    USING (status = 'published' OR user_id = current_setting('app.current_user_id', TRUE)::BIGINT);

CREATE POLICY "policy_posts_owner_write"
    ON "posts"
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::BIGINT OR 
           current_setting('app.current_user_role', TRUE) = 'admin');

-- ============================================================================
-- 20. COMMENTS
-- ============================================================================

/* Table comments */
COMMENT ON TABLE "product" IS 'Main product catalog table containing all products available for sale';
COMMENT ON TABLE "customer" IS 'Customer information including contact details and preferences';
COMMENT ON TABLE "order" IS 'Customer orders with status tracking and payment information';
COMMENT ON TABLE "user" IS 'Application users with authentication and authorization data';
COMMENT ON TABLE "posts" IS 'Blog posts and articles created by users';
COMMENT ON TABLE "sales" IS 'Partitioned sales data for analytics and reporting';
COMMENT ON TABLE audit.audit_log IS 'Audit trail for tracking all data changes';

/* Column comments */
COMMENT ON COLUMN "product"."uuid" IS 'Public-facing unique identifier (never expose product_id)';
COMMENT ON COLUMN "product"."sku" IS 'Stock Keeping Unit - unique product identifier for inventory';
COMMENT ON COLUMN "product"."search_vector" IS 'Full-text search index for product name, description, manufacturer';
COMMENT ON COLUMN "customer"."loyalty_points" IS 'Accumulated loyalty points (1 point per dollar spent)';
COMMENT ON COLUMN "customer"."discount_percentage" IS 'Permanent discount percentage for VIP customers (0-100)';
COMMENT ON COLUMN "order"."priority" IS 'Order fulfillment priority - affects warehouse processing order';
COMMENT ON COLUMN "user"."password" IS 'BCrypt hashed password (60 characters)';
COMMENT ON COLUMN "user"."two_factor_secret" IS 'Encrypted TOTP secret for 2FA - null if 2FA not enabled';
COMMENT ON COLUMN "user"."full_name" IS 'Generated column combining first_name and last_name';

/* Constraint comments */
COMMENT ON CONSTRAINT "FK_order_customer" ON "order" IS 'Links order to the customer who placed it';
COMMENT ON CONSTRAINT "CHK_product_price_gt_cost" ON "product" IS 'Ensures product price is greater than cost for profitability';
COMMENT ON CONSTRAINT "EX_no_overlapping_reservations" ON "room_reservations" IS 'Prevents double-booking of meeting rooms';

/* Index comments */
COMMENT ON INDEX "IDX_product_search" IS 'GIN index for full-text search on product name, description, manufacturer';
COMMENT ON INDEX "IDX_order_pending" IS 'Partial index for quick lookup of pending orders only';

/* Function comments */
COMMENT ON FUNCTION calculate_discount(NUMERIC, NUMERIC) IS 'Calculates discounted price given original price and discount percentage';
COMMENT ON FUNCTION get_customer_orders(BIGINT) IS 'Returns all orders for a specific customer ordered by date descending';
COMMENT ON FUNCTION authenticate_user(TEXT, TEXT) IS 'Authenticates user by username/password, returns user info if valid';

/* View comments */
COMMENT ON VIEW "v_active_products" IS 'Active products with category name - excludes deleted and inactive products (security_invoker)';
COMMENT ON VIEW "v_customer_orders" IS 'Customer order summary with totals and loyalty information (security_invoker)';
COMMENT ON VIEW "v_product_json" IS 'Products as JSON objects using PostgreSQL 16+ json_object() function';
COMMENT ON MATERIALIZED VIEW "mv_daily_sales_summary" IS 'Pre-aggregated daily sales metrics - refresh daily';
COMMENT ON MATERIALIZED VIEW "mv_product_performance" IS 'Product sales performance metrics - refresh hourly';

/* Type comments */
COMMENT ON TYPE order_status IS 'Order lifecycle states from pending to delivered/cancelled';
COMMENT ON TYPE user_role IS 'User permission levels - admin has full access, guest has read-only';
COMMENT ON TYPE address_type IS 'Composite type for storing complete postal addresses';
COMMENT ON DOMAIN email_domain IS 'Email validation domain - enforces RFC 5322 basic format';

/* Schema comments */
COMMENT ON SCHEMA audit IS 'Audit logging tables and functions for compliance tracking';
COMMENT ON SCHEMA archive IS 'Archived/historical data for long-term storage';

/* Sequence comments */
COMMENT ON SEQUENCE invoice_number_seq IS 'Auto-incrementing invoice numbers starting at 1000 (with CACHE 10)';
COMMENT ON SEQUENCE ticket_number_seq IS 'Support ticket numbering sequence';

/* Trigger comments */
COMMENT ON TRIGGER "TR_product_updated_at" ON "product" IS 'Automatically updates updated_at timestamp on row modification';
COMMENT ON TRIGGER "TR_user_audit" ON "user" IS 'Records all user table changes to audit log';
COMMENT ON TRIGGER "TR_product_search_vector" ON "product" IS 'Updates full-text search vector on content changes';

/* Procedure comments */
COMMENT ON PROCEDURE upsert_product_inventory(BIGINT, VARCHAR, INTEGER) IS 'MERGE-based upsert for inventory (PostgreSQL 15+)';

-- ============================================================================
-- 21. SAMPLE DATA
-- ============================================================================

/* Insert sample categories */
INSERT INTO "category" ("name", "slug", "description", "sort_order") VALUES
    ('Electronics', 'electronics', 'Electronic devices and accessories', 1),
    ('Clothing', 'clothing', 'Apparel and fashion items', 2),
    ('Books', 'books', 'Books and publications', 3),
    ('Home & Garden', 'home-garden', 'Home improvement and garden supplies', 4);

/* Insert subcategories */
INSERT INTO "category" ("parent_id", "name", "slug", "description", "sort_order") VALUES
    (1, 'Smartphones', 'smartphones', 'Mobile phones and accessories', 1),
    (1, 'Laptops', 'laptops', 'Portable computers', 2),
    (2, 'Men''s Clothing', 'mens-clothing', 'Clothing for men', 1),
    (2, 'Women''s Clothing', 'womens-clothing', 'Clothing for women', 2);

/* Insert sample tags */
INSERT INTO "tag" ("name", "color") VALUES
    ('New Arrival', '#00FF00'),
    ('Best Seller', '#FF0000'),
    ('On Sale', '#FFA500'),
    ('Limited Edition', '#800080'),
    ('Eco-Friendly', '#008000');

/* Insert sample products */
INSERT INTO "product" ("sku", "product_name", "description", "category_id", "price", "cost", "tags", "is_featured", "rating", "review_count", "manufacturer") VALUES
    ('PHONE-001', 'Smartphone Pro X', 'Latest flagship smartphone with advanced features', 5, 999.99, 650.00, ARRAY['electronics', 'mobile'], TRUE, 4.5, 128, 'TechCorp'),
    ('LAPTOP-001', 'UltraBook 15', 'Lightweight laptop for professionals', 6, 1299.99, 900.00, ARRAY['electronics', 'computer'], TRUE, 4.8, 256, 'CompuWorld'),
    ('SHIRT-001', 'Classic Cotton Shirt', 'Premium cotton dress shirt', 7, 59.99, 25.00, ARRAY['clothing', 'formal'], FALSE, 4.2, 45, 'FashionBrand'),
    ('BOOK-001', 'PostgreSQL Mastery', 'Complete guide to PostgreSQL database', 3, 49.99, 15.00, ARRAY['books', 'technical'], FALSE, 4.9, 312, 'TechBooks Inc');

/* Insert sample customers */
INSERT INTO "customer" ("name", "email", "phone", "role", "loyalty_points", "is_verified") VALUES
    ('John Doe', 'john.doe@example.com', '+1-555-0101', 'user', 500, TRUE),
    ('Jane Smith', 'jane.smith@example.com', '+1-555-0102', 'user', 1200, TRUE),
    ('Bob Wilson', 'bob.wilson@example.com', '+1-555-0103', 'guest', 50, FALSE);

/* Insert sample users using OVERRIDING SYSTEM VALUE for GENERATED ALWAYS */
INSERT INTO "user" ("first_name", "last_name", "email", "username", "password", "role", "is_verified") 
OVERRIDING SYSTEM VALUE VALUES
    (1, 'Admin', 'User', 'admin@example.com', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', TRUE),
    (2, 'John', 'Doe', 'john@example.com', 'johnd', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', TRUE),
    (3, 'Jane', 'Smith', 'jane@example.com', 'janes', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'moderator', TRUE);

/* Insert sample profiles */
INSERT INTO "profile" ("user_id", "bio", "website", "location") VALUES
    (1, 'System administrator', 'https://admin.example.com', 'New York, NY'),
    (2, 'Software developer and tech enthusiast', 'https://johndoe.dev', 'San Francisco, CA'),
    (3, 'Content moderator and writer', NULL, 'Los Angeles, CA');

/* Insert sample posts */
INSERT INTO "posts" ("user_id", "title", "slug", "content", "excerpt", "status", "is_featured") VALUES
    (2, 'Getting Started with PostgreSQL', 'getting-started-postgresql', 'PostgreSQL is a powerful, open source database...', 'Learn the basics of PostgreSQL', 'published', TRUE),
    (2, 'Advanced SQL Techniques', 'advanced-sql-techniques', 'In this post, we explore advanced SQL patterns...', 'Master advanced SQL queries', 'published', FALSE),
    (3, 'Draft Post Example', 'draft-post-example', 'This is a draft post that is not yet published...', 'A work in progress', 'draft', FALSE);

/* Insert sample meeting rooms */
INSERT INTO "meeting_rooms" ("name", "capacity", "floor", "has_projector", "has_video_conference") VALUES
    ('Conference Room A', 10, 1, TRUE, TRUE),
    ('Small Meeting Room', 4, 1, FALSE, FALSE),
    ('Board Room', 20, 2, TRUE, TRUE);

/* Insert sample settings */
INSERT INTO "settings" ("key", "value", "description", "is_public") VALUES
    ('site.name', '"My E-Commerce Store"', 'Name of the website', TRUE),
    ('site.maintenance_mode', 'false', 'Enable maintenance mode', FALSE),
    ('email.smtp_host', '"smtp.example.com"', 'SMTP server hostname', FALSE),
    ('features.enable_reviews', 'true', 'Enable product reviews feature', TRUE);

/* Insert sample sales data */
INSERT INTO "sales" ("product_id", "customer_id", "quantity", "unit_price", "sale_date") VALUES
    (1, 1, 1, 999.99, '2024-01-15'),
    (2, 1, 1, 1299.99, '2024-02-20'),
    (3, 2, 2, 59.99, '2024-03-10'),
    (4, 2, 1, 49.99, '2024-04-05'),
    (1, 3, 1, 999.99, '2024-05-01'),
    (3, 1, 3, 59.99, '2024-06-15'),
    (2, 2, 1, 1299.99, '2024-07-20'),
    (4, 3, 2, 49.99, '2024-08-10');

-- ============================================================================
-- 22. REFRESH MATERIALIZED VIEWS (After data insert)
-- ============================================================================
REFRESH MATERIALIZED VIEW "mv_daily_sales_summary";
REFRESH MATERIALIZED VIEW "mv_product_performance";

-- ============================================================================
-- SCHEMA COMPLETE - PostgreSQL 16+ Best Practices
-- ============================================================================
-- This comprehensive schema includes:
-- ✅ Tables with IDENTITY columns (SQL standard, replaces SERIAL)
-- ✅ GENERATED ALWAYS AS computed columns
-- ✅ gen_random_uuid() (built-in, no extension needed)
-- ✅ Views with security_invoker = true (PostgreSQL 15+)
-- ✅ json_object() function (PostgreSQL 16+)
-- ✅ MERGE statement in procedures (PostgreSQL 15+)
-- ✅ NULLS NOT DISTINCT indexes (PostgreSQL 15+)
-- ✅ FORCE ROW LEVEL SECURITY (PostgreSQL 15+ best practice)
-- ✅ Functions with RETURNS NULL ON NULL INPUT
-- ✅ Functions with SET search_path (security)
-- ✅ Sequences with AS BIGINT and CACHE
-- ✅ CURRENT_TIMESTAMP instead of NOW() (SQL standard)
-- ✅ Procedures (PostgreSQL 11+)
-- ✅ Custom Aggregates with PARALLEL = SAFE
-- ✅ Types (enum, composite, domain, range)
-- ✅ Indexes (B-tree, GIN, GiST, Hash, BRIN, partial, expression, covering)
-- ✅ Triggers (BEFORE, AFTER, FOR EACH ROW)
-- ✅ Rules (INSTEAD, ALSO)
-- ✅ Constraints (PK, FK, Unique, Check, Exclusion)
-- ✅ Row Level Security Policies
-- ✅ Comments (on all object types)
-- ✅ Partitioned tables
-- ✅ Custom Schemas
-- ✅ Sample Data
-- ============================================================================
