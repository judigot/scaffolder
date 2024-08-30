import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import generateSQLSchema from '@/utils/generateSQLSchema';
import { format as formatSQL } from 'sql-formatter';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';
import { APP_SETTINGS } from '@/constants';

describe('generateSQLSchema', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct SQL schema for one-to-one relationship', () => {
    const deleteTablesQueries = generateSQLDeleteTables(
      userPostOneToOneSchemaInfo,
    );
    const sqlSchema = `${String(deleteTablesQueries.join('\n'))}\n\n${formatSQL(generateSQLSchema(userPostOneToOneSchemaInfo))}`;
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "user";');
    expect(sqlSchema).toContain('CREATE TABLE "user" (');
    expect(sqlSchema).toContain('"user_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"first_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"last_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"email" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"username" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"password" CHAR(60) NOT NULL');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "post";');
    expect(sqlSchema).toContain('CREATE TABLE "post" (');
    expect(sqlSchema).toContain('"post_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"user_id" BIGINT NOT NULL UNIQUE'); // Enforce one-to-one with UNIQUE constraint
    expect(sqlSchema).toContain('"title" TEXT NOT NULL');
    expect(sqlSchema).toContain('"content" TEXT');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.onDeleteCascade) {
      expect(sqlSchema).toContain(
        'CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE',
      );
    } else {
      expect(sqlSchema).toContain(
        'CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
      );
    }
  });

  it('should generate correct SQL schema for one-to-many relationship', () => {
    const deleteTablesQueries = generateSQLDeleteTables(
      userPostsOneToManySchemaInfo,
    );
    const sqlSchema = `${String(deleteTablesQueries.join('\n'))}\n\n${formatSQL(generateSQLSchema(userPostsOneToManySchemaInfo))}`;
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "user";');
    expect(sqlSchema).toContain('CREATE TABLE "user" (');
    expect(sqlSchema).toContain('"user_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"first_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"last_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"email" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"username" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"password" CHAR(60) NOT NULL');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "post";');
    expect(sqlSchema).toContain('CREATE TABLE "post" (');
    expect(sqlSchema).toContain('"post_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"user_id" BIGINT NOT NULL'); // One-to-many does not use UNIQUE constraint
    expect(sqlSchema).toContain('"title" TEXT NOT NULL');
    expect(sqlSchema).toContain('"content" TEXT');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain(
      'CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
    );
  });

  it('should generate correct SQL schema for POS', () => {
    const deleteTablesQueries = generateSQLDeleteTables(POSSchemaInfo);
    const sqlSchema = `${String(deleteTablesQueries.join('\n'))}\n\n${formatSQL(generateSQLSchema(POSSchemaInfo))}`;
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "order_product";');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "order";');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "customer";');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "product";');
    expect(sqlSchema).toContain('CREATE TABLE "product" (');
    expect(sqlSchema).toContain('"product_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"product_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('CREATE TABLE "customer" (');
    expect(sqlSchema).toContain('"customer_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"name" TEXT NOT NULL');
    expect(sqlSchema).toContain('CREATE TABLE "order" (');
    expect(sqlSchema).toContain('"order_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"customer_id" BIGINT NOT NULL');
    expect(sqlSchema).toContain(
      'CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id")',
    );
    expect(sqlSchema).toContain('CREATE TABLE "order_product" (');
    expect(sqlSchema).toContain('"order_product_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"order_id" BIGINT NOT NULL');
    expect(sqlSchema).toContain('"product_id" BIGINT NOT NULL');
    expect(sqlSchema).toContain(
      'CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id")',
    );
    expect(sqlSchema).toContain(
      'CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id")',
    );
  });
});
