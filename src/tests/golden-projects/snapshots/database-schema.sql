DROP TABLE IF EXISTS "user_user_type";

DROP TABLE IF EXISTS "user_type";

DROP TABLE IF EXISTS "posts";

DROP TABLE IF EXISTS "profile";

DROP TABLE IF EXISTS "oauth_account";

DROP TABLE IF EXISTS "session";

DROP TABLE IF EXISTS "user";

DROP TABLE IF EXISTS "order_product";

DROP TABLE IF EXISTS "order";

DROP TABLE IF EXISTS "customer";

DROP TABLE IF EXISTS "product";

CREATE TABLE "product" (
  "id" BIGSERIAL PRIMARY KEY,
  "product_name" TEXT NOT NULL
);

CREATE TABLE "customer" ("id" BIGSERIAL PRIMARY KEY, "name" TEXT NOT NULL);

CREATE TABLE "order" (
  "id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("id")
);

CREATE TABLE "order_product" (
  "order_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("id"),
  CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("id"),
  PRIMARY KEY ("order_id", "product_id")
);

CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "username" TEXT UNIQUE NOT NULL,
  "password_hash" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "avatar_url" TEXT,
  "email_verified" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "updated_at" TIMESTAMPTZ (6) DEFAULT NOW ()
);

CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ (6) NOT NULL,
  CONSTRAINT "FK_session_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id")
);

CREATE TABLE "oauth_account" (
  "provider_id" TEXT NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "FK_oauth_account_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id"),
  PRIMARY KEY ("provider_id", "provider_user_id")
);

CREATE TABLE "profile" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" TEXT UNIQUE NOT NULL,
  "bio" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "updated_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id")
);

CREATE TABLE "posts" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "created_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "updated_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id")
);

CREATE TABLE "user_type" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "created_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "updated_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "deleted_at" TIMESTAMPTZ (6)
);

CREATE TABLE "user_user_type" (
  "user_id" TEXT NOT NULL,
  "user_type_id" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "updated_at" TIMESTAMPTZ (6) DEFAULT NOW (),
  "deleted_at" TIMESTAMPTZ (6),
  CONSTRAINT "FK_user_user_type_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id"),
  CONSTRAINT "FK_user_user_type_user_type_id" FOREIGN KEY ("user_type_id") REFERENCES "user_type" ("id"),
  PRIMARY KEY ("user_id", "user_type_id")
);