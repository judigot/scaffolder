import { describe, it, expect } from 'vitest';
import {
  processLoopTables,
  processLoopTablesReversed,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';

describe('SQL Schema Template', () => {
  const userFiles: IStructure = [];
  const schemaInfoParsed = getSchemaInfo(masterSchema);

  const expectedDropOutput = `DROP TABLE IF EXISTS "posts";
DROP TABLE IF EXISTS "profile";
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS "order_product";
DROP TABLE IF EXISTS "order";
DROP TABLE IF EXISTS "customer";
DROP TABLE IF EXISTS "product";`;

  const expectedCreateProduct = `CREATE TABLE "product" (
  "product_id" BIGSERIAL PRIMARY KEY,
  "product_name" TEXT NOT NULL
);`;

  const expectedCreateCustomer = `CREATE TABLE "customer" (
  "customer_id" BIGSERIAL PRIMARY KEY,
  "name" TEXT NOT NULL
);`;

  const expectedCreateOrder = `CREATE TABLE "order" (
  "order_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id")
);`;

  const expectedCreateOrderProduct = `CREATE TABLE "order_product" (
  "order_product_id" BIGSERIAL PRIMARY KEY,
  "order_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id"),
  CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id")
);`;

  const expectedCreateUser = `CREATE TABLE "user" (
  "user_id" BIGSERIAL PRIMARY KEY,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "username" TEXT UNIQUE NOT NULL,
  "password" CHAR(60) NOT NULL,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL
);`;

  const expectedCreateProfile = `CREATE TABLE "profile" (
  "profile_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT UNIQUE NOT NULL,
  "bio" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL,
  CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")
);`;

  const expectedCreatePosts = `CREATE TABLE "posts" (
  "post_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL,
  CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")
);`;

  const expectedFullOutput = `${expectedDropOutput}

${expectedCreateProduct}

${expectedCreateCustomer}

${expectedCreateOrder}

${expectedCreateOrderProduct}

${expectedCreateUser}

${expectedCreateProfile}

${expectedCreatePosts}`;

  describe('DROP TABLE statements', () => {
    const expectedDropStatements = [
      'DROP TABLE IF EXISTS "posts";',
      'DROP TABLE IF EXISTS "profile";',
      'DROP TABLE IF EXISTS "user";',
      'DROP TABLE IF EXISTS "order_product";',
      'DROP TABLE IF EXISTS "order";',
      'DROP TABLE IF EXISTS "customer";',
      'DROP TABLE IF EXISTS "product";',
    ];

    it('should generate exact DROP TABLE output in reverse dependency order using LOOP(tablesReversed)', () => {
      const template = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;

      const result = processLoopTablesReversed(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      expect(result).toBe(expectedDropOutput);
    });

    it('should generate 7 DROP TABLE statements', () => {
      const template = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;

      const result = processLoopTablesReversed(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      const lines = result.split('\n');
      expect(lines).toHaveLength(7);
    });

    it('should have "posts" as the first DROP statement', () => {
      const template = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;

      const result = processLoopTablesReversed(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      const firstLine = result.split('\n')[0];
      expect(firstLine).toBe('DROP TABLE IF EXISTS "posts";');
    });

    it('should have "product" as the last DROP statement', () => {
      const template = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;

      const result = processLoopTablesReversed(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      const lines = result.split('\n');
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toBe('DROP TABLE IF EXISTS "product";');
    });

    expectedDropStatements.forEach((statement, index) => {
      it(`should have "${statement}" at position ${String(index)}`, () => {
        const template = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;

        const result = processLoopTablesReversed(
          template,
          masterSchema,
          schemaInfoParsed,
          userFiles,
        );

        const lines = result.split('\n');
        expect(lines[index]).toBe(statement);
      });
    });
  });

  describe('CREATE TABLE statements - Table Order', () => {
    const expectedTableOrder = [
      'product',
      'customer',
      'order',
      'order_product',
      'user',
      'profile',
      'posts',
    ];

    it('should generate CREATE TABLE statements in exact dependency order', () => {
      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;

      const result = processLoopTables(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      const lines = result.split('\n');
      expect(lines).toEqual(expectedTableOrder);
    });

    it('should have 7 CREATE TABLE statements', () => {
      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;

      const result = processLoopTables(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
      );

      const lines = result.split('\n');
      expect(lines).toHaveLength(7);
    });

    expectedTableOrder.forEach((tableName, index) => {
      it(`should have "${tableName}" at position ${String(index)}`, () => {
        const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;

        const result = processLoopTables(
          template,
          masterSchema,
          schemaInfoParsed,
          userFiles,
        );

        const lines = result.split('\n');
        expect(lines[index]).toBe(tableName);
      });
    });
  });

  describe('Column Definitions - Individual Tests', () => {
    it('should generate BIGSERIAL PRIMARY KEY for primary key columns', () => {
      const productTable = masterSchema.find((t) => t.tableName === 'product');
      if (!productTable) {
        throw new Error('Product table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF is_primary_key EQUALS 'true' %}BIGSERIAL PRIMARY KEY{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        productTable,
      );

      expect(result).toContain('"product_id" BIGSERIAL PRIMARY KEY');
    });

    it('should generate TEXT NOT NULL for string columns', () => {
      const productTable = masterSchema.find((t) => t.tableName === 'product');
      if (!productTable) {
        throw new Error('Product table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'string' %}TEXT{% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        productTable,
      );

      expect(result).toContain('"product_name" TEXT NOT NULL');
    });

    it('should generate BIGINT for number columns that are not primary keys', () => {
      const orderTable = masterSchema.find((t) => t.tableName === 'order');
      if (!orderTable) {
        throw new Error('Order table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'number' %}{% IF is_primary_key EQUALS 'false' %}BIGINT{% ENDIF %}{% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        orderTable,
      );

      expect(result).toContain('"customer_id" BIGINT NOT NULL');
    });

    it('should generate TIMESTAMPTZ (6) for Date columns', () => {
      const userTable = masterSchema.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('User table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'Date' %}TIMESTAMPTZ (6){% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        userTable,
      );

      expect(result).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
      expect(result).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');
    });

    it('should generate CHAR(60) for password column', () => {
      const userTable = masterSchema.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('User table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF value EQUALS 'password' %}CHAR(60){% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        userTable,
      );

      expect(result).toContain('"password" CHAR(60) NOT NULL');
    });

    it('should generate UNIQUE for unique columns', () => {
      const userTable = masterSchema.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('User table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'string' %}TEXT{% ENDIF %}{% IF is_unique EQUALS 'true' %} UNIQUE{% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        userTable,
      );

      expect(result).toContain('"email" TEXT UNIQUE NOT NULL');
      expect(result).toContain('"username" TEXT UNIQUE NOT NULL');
    });

    it('should generate BIGINT UNIQUE for unique number FK columns', () => {
      const profileTable = masterSchema.find((t) => t.tableName === 'profile');
      if (!profileTable) {
        throw new Error('Profile table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'number' %}{% IF is_primary_key EQUALS 'false' %}BIGINT{% ENDIF %}{% ENDIF %}{% IF is_unique EQUALS 'true' %} UNIQUE{% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        profileTable,
      );

      expect(result).toContain('"user_id" BIGINT UNIQUE NOT NULL');
    });

    it('should not add NOT NULL for nullable columns', () => {
      const postsTable = masterSchema.find((t) => t.tableName === 'posts');
      if (!postsTable) {
        throw new Error('Posts table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="\\"{{value}}\\" {% IF data_type EQUALS 'string' %}TEXT{% ENDIF %}{% IF is_nullable EQUALS 'NO' %} NOT NULL{% ENDIF %}" --separator=", " ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        postsTable,
      );

      expect(result).toContain('"content" TEXT,');
      expect(result).not.toContain('"content" TEXT NOT NULL');
    });
  });

  describe('Foreign Key Constraints - Exact Output', () => {
    it('should generate exact FK constraint for order table', () => {
      const orderTable = masterSchema.find((t) => t.tableName === 'order');
      if (!orderTable) {
        throw new Error('Order table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        orderTable,
      );

      expect(result).toBe(
        'CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id")',
      );
    });

    it('should generate exact FK constraints for order_product table', () => {
      const orderProductTable = masterSchema.find(
        (t) => t.tableName === 'order_product',
      );
      if (!orderProductTable) {
        throw new Error('Order product table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        orderProductTable,
      );

      expect(result)
        .toBe(`CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id"),
CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id")`);
    });

    it('should generate exact FK constraint for profile table', () => {
      const profileTable = masterSchema.find((t) => t.tableName === 'profile');
      if (!profileTable) {
        throw new Error('Profile table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        profileTable,
      );

      expect(result).toBe(
        'CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
      );
    });

    it('should generate exact FK constraint for posts table', () => {
      const postsTable = masterSchema.find((t) => t.tableName === 'posts');
      if (!postsTable) {
        throw new Error('Posts table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        postsTable,
      );

      expect(result).toBe(
        'CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
      );
    });

    it('should generate empty FK constraints for product table', () => {
      const productTable = masterSchema.find((t) => t.tableName === 'product');
      if (!productTable) {
        throw new Error('Product table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        productTable,
      );

      expect(result).toBe('');
    });

    it('should generate empty FK constraints for customer table', () => {
      const customerTable = masterSchema.find(
        (t) => t.tableName === 'customer',
      );
      if (!customerTable) {
        throw new Error('Customer table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        customerTable,
      );

      expect(result).toBe('');
    });

    it('should generate empty FK constraints for user table', () => {
      const userTable = masterSchema.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('User table not found');
      }

      const template = `[[ LOOP(columnsInfo) --template="{% IF has_foreign_key EQUALS 'true' %}CONSTRAINT \\"FK_{{tableName}}_{{value}}\\" FOREIGN KEY (\\"{{value}}\\") REFERENCES \\"{{foreign_table}}\\" (\\"{{foreign_column}}\\"){% ENDIF %}" --separator=",\\n" ]]`;

      const result = processIterateInTemplate(
        template,
        masterSchema,
        schemaInfoParsed,
        userFiles,
        userTable,
      );

      expect(result).toBe('');
    });
  });

  describe('Complete CREATE TABLE Statements - Exact Output', () => {
    it('should match exact CREATE TABLE for product', () => {
      expect(expectedFullOutput).toContain(expectedCreateProduct);
    });

    it('should match exact CREATE TABLE for customer', () => {
      expect(expectedFullOutput).toContain(expectedCreateCustomer);
    });

    it('should match exact CREATE TABLE for order', () => {
      expect(expectedFullOutput).toContain(expectedCreateOrder);
    });

    it('should match exact CREATE TABLE for order_product', () => {
      expect(expectedFullOutput).toContain(expectedCreateOrderProduct);
    });

    it('should match exact CREATE TABLE for user', () => {
      expect(expectedFullOutput).toContain(expectedCreateUser);
    });

    it('should match exact CREATE TABLE for profile', () => {
      expect(expectedFullOutput).toContain(expectedCreateProfile);
    });

    it('should match exact CREATE TABLE for posts', () => {
      expect(expectedFullOutput).toContain(expectedCreatePosts);
    });
  });

  describe('Full Output Verification', () => {
    it('should have DROP statements before CREATE statements', () => {
      const dropIndex = expectedFullOutput.indexOf('DROP TABLE');
      const createIndex = expectedFullOutput.indexOf('CREATE TABLE');
      expect(dropIndex).toBeLessThan(createIndex);
    });

    it('should have exactly one empty line between DROP and CREATE sections', () => {
      const parts = expectedFullOutput.split('\n\n');
      expect(parts[0]).toContain('DROP TABLE');
      expect(parts[1]).toContain('CREATE TABLE');
    });

    it('should have exactly one empty line between each CREATE TABLE statement', () => {
      const createStatements = expectedFullOutput
        .split('\n\n')
        .filter((part) => part.includes('CREATE TABLE'));
      expect(createStatements).toHaveLength(7);
    });

    it('should start with DROP TABLE IF EXISTS "posts";', () => {
      expect(
        expectedFullOutput.startsWith('DROP TABLE IF EXISTS "posts";'),
      ).toBe(true);
    });

    it('should end with posts FK constraint and closing parenthesis', () => {
      expect(
        expectedFullOutput.endsWith(
          'CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")\n);',
        ),
      ).toBe(true);
    });

    it('should have the exact full output structure', () => {
      const expectedLines = expectedFullOutput.split('\n');
      expect(expectedLines).toHaveLength(61);
    });
  });

  describe('Character-Level Verification', () => {
    it('should use double quotes for all identifiers', () => {
      const quoteCount = (expectedFullOutput.match(/"/g) ?? []).length;
      expect(quoteCount).toBeGreaterThan(0);
      expect(expectedFullOutput).not.toContain("'product'");
      expect(expectedFullOutput).not.toContain("'customer'");
    });

    it('should use BIGSERIAL PRIMARY KEY for all primary keys', () => {
      const primaryKeyMatches =
        expectedFullOutput.match(/BIGSERIAL PRIMARY KEY/g) ?? [];
      expect(primaryKeyMatches).toHaveLength(7);
    });

    it('should use BIGINT for all foreign key columns', () => {
      const bigintMatches = expectedFullOutput.match(/BIGINT/g) ?? [];
      expect(bigintMatches.length).toBeGreaterThanOrEqual(5);
    });

    it('should use TEXT for string columns', () => {
      const textMatches = expectedFullOutput.match(/TEXT/g) ?? [];
      expect(textMatches.length).toBeGreaterThan(0);
    });

    it('should use CHAR(60) for password column only', () => {
      const charMatches = expectedFullOutput.match(/CHAR\(60\)/g) ?? [];
      expect(charMatches).toHaveLength(1);
    });

    it('should use TIMESTAMPTZ (6) for date columns', () => {
      const timestampMatches =
        expectedFullOutput.match(/TIMESTAMPTZ \(6\)/g) ?? [];
      expect(timestampMatches).toHaveLength(6);
    });

    it('should have UNIQUE keyword for unique columns', () => {
      const uniqueMatches = expectedFullOutput.match(/UNIQUE/g) ?? [];
      expect(uniqueMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('should have NOT NULL for required columns', () => {
      const notNullMatches = expectedFullOutput.match(/NOT NULL/g) ?? [];
      expect(notNullMatches.length).toBeGreaterThan(10);
    });

    it('should have FK_ prefix for all foreign key constraints', () => {
      const fkMatches = expectedFullOutput.match(/FK_/g) ?? [];
      expect(fkMatches).toHaveLength(5);
    });

    it('should have REFERENCES keyword for all foreign keys', () => {
      const referencesMatches = expectedFullOutput.match(/REFERENCES/g) ?? [];
      expect(referencesMatches).toHaveLength(5);
    });
  });
});
