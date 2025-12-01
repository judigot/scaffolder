import { describe, it, expect } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';

describe('App Generator - Database Schema', () => {
  /**
   * Minify SQL by removing all whitespace including line breaks
   * This helps catch issues like unprocessed HTML tags
   * Returns a single line with no whitespace
   */
  const minifySQL = (sql: string): string => {
    return sql
      .replace(/\s*\(\s*/g, '(') // Remove spaces around opening parens
      .replace(/\s*\)\s*/g, ')') // Remove spaces around closing parens
      .replace(/\s*,\s*/g, ',') // Remove spaces around commas
      .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
      .replace(/\s+/g, '') // Remove all remaining whitespace including newlines
      .trim();
  };

  const expectedSchemaSQL = `DROP TABLE IF EXISTS "posts";
DROP TABLE IF EXISTS "profile";
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS "order_product";
DROP TABLE IF EXISTS "order";
DROP TABLE IF EXISTS "customer";
DROP TABLE IF EXISTS "product";
CREATE TABLE "product" (
  "product_id" BIGSERIAL PRIMARY KEY,
  "product_name" TEXT NOT NULL);

CREATE TABLE "customer" (
  "customer_id" BIGSERIAL PRIMARY KEY,
  "name" TEXT NOT NULL);

CREATE TABLE "order" (
  "order_id" BIGSERIAL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id"));

CREATE TABLE "order_product" (
  "order_product_id" BIGSERIAL PRIMARY KEY,
  "order_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id"),
  CONSTRAINT "FK_order_product_product_id" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id"));

CREATE TABLE "user" (
  "user_id" BIGSERIAL PRIMARY KEY,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "username" TEXT UNIQUE NOT NULL,
  "password" CHAR(60) NOT NULL,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL);

CREATE TABLE "profile" (
  "profile_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT UNIQUE NOT NULL,
  "bio" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL,
  CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id"));

CREATE TABLE "posts" (
  "post_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "created_at" TIMESTAMPTZ (6) NOT NULL,
  "updated_at" TIMESTAMPTZ (6) NOT NULL,
  CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id"));`;

  const createUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'App Generator - Database Schema',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content:
                'CREATE_FILE(schema.sql --template /Templates/schema.txt):',
            },
          ],
        },
      ],
    },
    {
      type: 'folder',
      name: 'Templates',
      children: [
        {
          type: 'file',
          name: 'schema.txt',
          content: `<@@FORMAT@@ language="sql">
<@@LOOP@@ data="tablesReversed" separator="\\n">
DROP TABLE IF EXISTS "{{tableName}}";
</@@LOOP@@>

<@@LOOP@@ data="tables" separator="\\n\\n">
CREATE TABLE "{{tableName}}" (
  <@@LOOP@@ data="columnsInfo" separator=",\\n">
    "{{value}}"<@@IF@@ condition="is_primary_key EQUALS 'true'"> BIGSERIAL PRIMARY KEY</@@IF@@><@@IF@@ condition="is_primary_key EQUALS 'false'">
      <@@IF@@ condition="data_type EQUALS 'number'"> BIGINT</@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'string'">
        <@@IF@@ condition="value EQUALS 'password'"> CHAR(60)<@@ELSE@@> TEXT</@@ELSE@@></@@IF@@>
      </@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'Date'"> TIMESTAMPTZ (6)</@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'boolean'"> BOOLEAN</@@IF@@>
      <@@IF@@ condition="is_unique EQUALS 'true'"> UNIQUE</@@IF@@>
      <@@IF@@ condition="is_nullable EQUALS 'NO'"> NOT NULL</@@IF@@>
    </@@IF@@>
  </@@LOOP@@>
  <@@LOOP@@ data="columnsInfo" separator="">
    <@@IF@@ condition="has_foreign_key EQUALS 'true'">,
    CONSTRAINT "FK_{{tableName}}_{{value}}" FOREIGN KEY ("{{value}}") REFERENCES "{{foreign_table}}" ("{{foreign_column}}")</@@IF@@>
  </@@LOOP@@>
);
</@@LOOP@@>
</@@FORMAT@@>`,
        },
      ],
    },
  ];

  const formData: IFormStore = {
    schemaInput: {},
    backendUrl: 'http://localhost:5000',
    backendDir: '',
    frontendDir: '',
    dbConnection: 'postgresql://localhost:5432/test',
    framework: frameworks.LARAVEL,
    includeInsertData: false,
    insertOption: 'SQLInsertQueriesFromMockData',
    includeTypeGuards: false,
    outputOnSingleFile: false,
    dbType: 'postgresql',
    quote: '"',
    publicRepoURL: '',
    clientID: '',
    clientSecret: '',
    creationMode: CREATION_MODES.SCHEMA_BUILDER,
    dbUsername: '',
    dbPassword: '',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: '',
    setCreationMode: (): void => {
      /* stub */
    },
    setMasterSchema: (): void => {
      /* stub */
    },
    setOneToOne: (): void => {
      /* stub */
    },
    setOneToMany: (): void => {
      /* stub */
    },
    setManyToMany: (): void => {
      /* stub */
    },
    setDBType: (): void => {
      /* stub */
    },
    setPublicRepoURL: (): void => {
      /* stub */
    },
    setDbConnection: (): void => {
      /* stub */
    },
  };

  it('should generate schema.sql file', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    expect(result.structure).toHaveLength(1);
    expect(result.structure[0].type).toBe('file');
    expect(result.structure[0].name).toBe('schema.sql');
  });

  it('should generate schema.sql with correct DROP TABLE statements in reverse order', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const content = schemaFile.content;

    expect(content).toContain('DROP TABLE IF EXISTS "posts";');
    expect(content).toContain('DROP TABLE IF EXISTS "product";');

    const dropPosts = content.indexOf('DROP TABLE IF EXISTS "posts"');
    const dropProduct = content.indexOf('DROP TABLE IF EXISTS "product"');
    expect(dropPosts).toBeLessThan(dropProduct);
  });

  it('should generate schema.sql with correct CREATE TABLE statements', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const content = schemaFile.content;

    expect(content).toContain('CREATE TABLE "product"');
    expect(content).toContain('CREATE TABLE "customer"');
    expect(content).toContain('CREATE TABLE "order"');
    expect(content).toContain('CREATE TABLE "order_product"');
    expect(content).toContain('CREATE TABLE "user"');
    expect(content).toContain('CREATE TABLE "profile"');
    expect(content).toContain('CREATE TABLE "posts"');
  });

  it('should generate schema.sql with correct column definitions', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const content = schemaFile.content;

    expect(content).toContain('"product_id" BIGSERIAL PRIMARY KEY');
    expect(content).toContain('"product_name" TEXT NOT NULL');
    expect(content).toContain('"password" CHAR(60) NOT NULL');
    expect(content).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(content).toContain('"email" TEXT UNIQUE NOT NULL');
  });

  it('should generate schema.sql with correct foreign key constraints', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const content = schemaFile.content;

    expect(content).toContain(
      'CONSTRAINT "FK_order_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id")',
    );
    expect(content).toContain(
      'CONSTRAINT "FK_order_product_order_id" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id")',
    );
    expect(content).toContain(
      'CONSTRAINT "FK_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
    );
    expect(content).toContain(
      'CONSTRAINT "FK_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
    );
  });

  it('should generate exact schema.sql content', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const minifiedActual = minifySQL(schemaFile.content);
    const minifiedExpected = minifySQL(expectedSchemaSQL);
    expect(minifiedActual).toBe(minifiedExpected);
  });

  it('should generate schema.sql with no HTML tags (strict minified check)', async () => {
    const userFiles = createUserFiles();
    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const actual = schemaFile.content;
    const expected = expectedSchemaSQL;

    // Minify both for comparison (catches whitespace issues and unprocessed tags)
    const minifiedActual = minifySQL(actual);
    const minifiedExpected = minifySQL(expected);

    // Check for HTML tags in output (should not exist)
    expect(actual).not.toContain('<@@LOOP@@');
    expect(actual).not.toContain('</@@LOOP@@>');
    expect(actual).not.toContain('<@@IF@@');
    expect(actual).not.toContain('</@@IF@@>');
    expect(actual).not.toContain('<@@ELSE@@>');

    // Strict minified comparison
    expect(minifiedActual).toBe(minifiedExpected);
  });

  it('should format SQL output when using FORMAT tag', async () => {
    const userFilesWithFormat: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'App Generator - Database Schema',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content:
                  'CREATE_FILE(schema-formatted.sql --template /Templates/schema-formatted.txt):',
              },
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'Templates',
        children: [
          {
            type: 'file',
            name: 'schema-formatted.txt',
            content: `<@@FORMAT@@ language="sql">
<@@LOOP@@ data="tablesReversed" separator="\\n">
DROP TABLE IF EXISTS "{{tableName}}";
</@@LOOP@@>

<@@LOOP@@ data="tables" separator="\\n\\n">
CREATE TABLE "{{tableName}}" (
  <@@LOOP@@ data="columnsInfo" separator=",\\n">
    "{{value}}"<@@IF@@ condition="is_primary_key EQUALS 'true'"> BIGSERIAL PRIMARY KEY</@@IF@@><@@IF@@ condition="is_primary_key EQUALS 'false'">
      <@@IF@@ condition="data_type EQUALS 'number'"> BIGINT</@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'string'">
        <@@IF@@ condition="value EQUALS 'password'"> CHAR(60)<@@ELSE@@> TEXT</@@ELSE@@></@@IF@@>
      </@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'Date'"> TIMESTAMPTZ (6)</@@IF@@>
      <@@IF@@ condition="data_type EQUALS 'boolean'"> BOOLEAN</@@IF@@>
      <@@IF@@ condition="is_unique EQUALS 'true'"> UNIQUE</@@IF@@>
      <@@IF@@ condition="is_nullable EQUALS 'NO'"> NOT NULL</@@IF@@>
    </@@IF@@>
  </@@LOOP@@>
  <@@LOOP@@ data="columnsInfo" separator="">
    <@@IF@@ condition="has_foreign_key EQUALS 'true'">,
    CONSTRAINT "FK_{{tableName}}_{{value}}" FOREIGN KEY ("{{value}}") REFERENCES "{{foreign_table}}" ("{{foreign_column}}")</@@IF@@>
  </@@LOOP@@>
);
</@@LOOP@@>
</@@FORMAT@@>`,
          },
        ],
      },
    ];

    const projectPath =
      '/Projects/App Generator - Database Schema/structure.yaml';

    const result = await buildProjectFiles(
      projectPath,
      userFilesWithFormat,
      masterSchema,
      formData,
      null,
    );

    const firstItem = result.structure[0];
    if (firstItem.type !== 'file') {
      throw new Error('Expected file but got folder');
    }
    const schemaFile: IFile = firstItem;
    const content = schemaFile.content;

    expect(content).not.toContain('<@@FORMAT@@');
    expect(content).not.toContain('</@@FORMAT@@>');
    expect(content).toContain('DROP TABLE');
    expect(content).toContain('CREATE TABLE');
    expect(minifySQL(content)).toBe(minifySQL(expectedSchemaSQL));
  });
});
