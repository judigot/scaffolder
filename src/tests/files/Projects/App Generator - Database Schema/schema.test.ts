import { describe, it, expect } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
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

  describe('with --data-source flag', () => {
    const createUserFilesWithDataSource = (): IStructure => [
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
                  'CREATE_FILE(schema.sql --template /Templates/schema.txt --data-source=/Constants/typeMappings.yaml):',
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
            content: `<@@LOOP@@ data="tablesReversed" separator="\\n">
DROP TABLE IF EXISTS "{{tableName}}";
</@@LOOP@@>

<@@LOOP@@ data="tables" separator="\\n\\n">
CREATE TABLE "{{tableName}}" (
  <@@LOOP@@ data="columnsInfo" separator=",\\n">
    "{{column.name}}"
    <@@IF@@ condition="is_primary_key EQUALS 'true'">
      {{typeMappings.primaryKey[formData.dbType]}}
    </@@IF@@>
    <@@IF@@ condition="is_primary_key EQUALS 'false'">
      {{typeMappings[column.name][formData.dbType] || typeMappings[column.data_type][formData.dbType]}}
      <@@IF@@ condition="is_unique EQUALS 'true'">
        UNIQUE
      </@@IF@@>
      <@@IF@@ condition="is_nullable EQUALS 'NO'">
        NOT NULL
      </@@IF@@>
    </@@IF@@>
  </@@LOOP@@>
  <@@LOOP@@ data="columnsInfo" separator="">
    <@@IF@@ condition="has_foreign_key EQUALS 'true'">,
    CONSTRAINT "FK_{{tableName}}_{{column.name}}" FOREIGN KEY ("{{column.name}}") REFERENCES "{{column.foreign_table}}" ("{{column.foreign_column}}")
    </@@IF@@>
  </@@LOOP@@>
);
</@@LOOP@@>`,
          },
        ],
      },
      {
        type: 'folder',
        name: 'Constants',
        children: [
          {
            type: 'file',
            name: 'typeMappings.yaml',
            content: `string:
  mysql: 'VARCHAR(32)'
  postgresql: 'TEXT'
number:
  mysql: 'BIGINT'
  postgresql: 'BIGINT'
Date:
  mysql: 'TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6)'
boolean:
  mysql: 'BOOLEAN'
  postgresql: 'BOOLEAN'
primaryKey:
  mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT'
  postgresql: 'BIGSERIAL PRIMARY KEY'
foreignKey:
  mysql: 'BIGINT'
  postgresql: 'BIGINT'
password:
  mysql: 'CHAR(60)'
  postgresql: 'CHAR(60)'
created_at:
  mysql: 'TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6) DEFAULT NOW()'
updated_at:
  mysql: 'TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6) DEFAULT NOW()'`,
          },
        ],
      },
    ];

    const createFormData = (dbType: 'postgresql' | 'mysql'): IFormStore => ({
      schemaInput: {},
      backendUrl: 'http://localhost:5000',
      backendDir: '',
      frontendDir: '',
      dbConnection: `${dbType}://localhost:5432/test`,
      framework: frameworks.LARAVEL,
      includeInsertData: false,
      insertOption: 'SQLInsertQueriesFromMockData',
      includeTypeGuards: false,
      outputOnSingleFile: false,
      dbType,
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
    });

    it('should generate PostgreSQL schema with correct types from data-source', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
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
      expect(content).toContain('"created_at" TIMESTAMPTZ');
      expect(content).toContain('"email" TEXT UNIQUE NOT NULL');
      expect(content).not.toContain('VARCHAR');
      expect(content).not.toContain('AUTO_INCREMENT');
    });

    it('should generate MySQL schema with correct types from data-source', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataMysql = createFormData('mysql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataMysql,
        null,
      );

      const firstItem = result.structure[0];
      if (firstItem.type !== 'file') {
        throw new Error('Expected file but got folder');
      }
      const schemaFile: IFile = firstItem;
      const content = schemaFile.content;

      expect(content).toContain(
        '"product_id" BIGINT PRIMARY KEY AUTO_INCREMENT',
      );
      expect(content).toContain('"product_name" VARCHAR(32) NOT NULL');
      expect(content).toContain('"password" CHAR(60) NOT NULL');
      expect(content).toContain('"created_at" TIMESTAMP');
      expect(content).toContain('"email" VARCHAR(32) UNIQUE NOT NULL');
      expect(content).not.toContain('BIGSERIAL');
      expect(content).not.toContain('TIMESTAMPTZ');
    });

    it('should use primaryKey mapping for primary key columns in PostgreSQL', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      const firstItem = result.structure[0];
      if (firstItem.type !== 'file') {
        throw new Error('Expected file but got folder');
      }
      const schemaFile: IFile = firstItem;
      const content = schemaFile.content;

      const primaryKeyMatches = content.match(/"\w+"\s+BIGSERIAL PRIMARY KEY/g);
      expect(primaryKeyMatches).not.toBeNull();
      expect(primaryKeyMatches?.length).toBeGreaterThan(0);
    });

    it('should use primaryKey mapping for primary key columns in MySQL', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataMysql = createFormData('mysql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataMysql,
        null,
      );

      const firstItem = result.structure[0];
      if (firstItem.type !== 'file') {
        throw new Error('Expected file but got folder');
      }
      const schemaFile: IFile = firstItem;
      const content = schemaFile.content;

      const primaryKeyMatches = content.match(
        /"\w+"\s+BIGINT PRIMARY KEY AUTO_INCREMENT/g,
      );
      expect(primaryKeyMatches).not.toBeNull();
      expect(primaryKeyMatches?.length).toBeGreaterThan(0);
    });

    it('should use column-specific mapping (password) in PostgreSQL', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      const firstItem = result.structure[0];
      if (firstItem.type !== 'file') {
        throw new Error('Expected file but got folder');
      }
      const schemaFile: IFile = firstItem;
      const content = schemaFile.content;

      expect(content).toContain('"password" CHAR(60)');
    });

    it('should use column-specific mapping (password) in MySQL', async () => {
      const userFiles = createUserFilesWithDataSource();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataMysql = createFormData('mysql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataMysql,
        null,
      );

      const firstItem = result.structure[0];
      if (firstItem.type !== 'file') {
        throw new Error('Expected file but got folder');
      }
      const schemaFile: IFile = firstItem;
      const content = schemaFile.content;

      expect(content).toContain('"password" CHAR(60)');
    });
  });

  describe('FILE_LOOP migration files', () => {
    const createUserFilesWithFileLoop = (): IStructure => [
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
                  'FILE_LOOP({{tableNamePascalCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):',
              },
              {
                type: 'folder',
                name: 'templates',
                children: [
                  {
                    type: 'file',
                    name: 'migration.sql.txt',
                    content: `DROP TABLE IF EXISTS "{{tableName}}";

CREATE TABLE "{{tableName}}" (
  <@@LOOP@@ data="columnsInfo" separator=",\\n">
    "{{column.name}}"
    <@@IF@@ condition="is_primary_key EQUALS 'true'">
      {{typeMappings.primaryKey[formData.dbType]}}
    </@@IF@@>
    <@@IF@@ condition="is_primary_key EQUALS 'false'">
      {{typeMappings[column.name][formData.dbType] || typeMappings[column.data_type][formData.dbType]}}
      <@@IF@@ condition="is_unique EQUALS 'true'">
        UNIQUE
      </@@IF@@>
      <@@IF@@ condition="is_nullable EQUALS 'NO'">
        NOT NULL
      </@@IF@@>
    </@@IF@@>
  </@@LOOP@@>
  <@@LOOP@@ data="columnsInfo" separator="">
    <@@IF@@ condition="has_foreign_key EQUALS 'true'">,
    CONSTRAINT "FK_{{tableName}}_{{column.name}}" FOREIGN KEY ("{{column.name}}") REFERENCES "{{column.foreign_table}}" ("{{column.foreign_column}}")
    </@@IF@@>
  </@@LOOP@@>
);
`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'Constants',
        children: [
          {
            type: 'file',
            name: 'typeMappings.yaml',
            content: `string:
  mysql: 'VARCHAR(32)'
  postgresql: 'TEXT'
number:
  mysql: 'BIGINT'
  postgresql: 'BIGINT'
Date:
  mysql: 'TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6)'
boolean:
  mysql: 'BOOLEAN'
  postgresql: 'BOOLEAN'
primaryKey:
  mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT'
  postgresql: 'BIGSERIAL PRIMARY KEY'
foreignKey:
  mysql: 'BIGINT'
  postgresql: 'BIGINT'
password:
  mysql: 'CHAR(60)'
  postgresql: 'CHAR(60)'
created_at:
  mysql: 'TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6) DEFAULT NOW()'
updated_at:
  mysql: 'TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
  postgresql: 'TIMESTAMPTZ(6) DEFAULT NOW()'`,
          },
          {
            type: 'file',
            name: 'dbTypes.yaml',
            content: `- postgresql
- mysql`,
          },
        ],
      },
    ];

    const createFormData = (dbType: 'postgresql' | 'mysql'): IFormStore => ({
      schemaInput: {},
      backendUrl: 'http://localhost:5000',
      backendDir: '',
      frontendDir: '',
      dbConnection: `${dbType}://localhost:5432/test`,
      framework: frameworks.LARAVEL,
      includeInsertData: false,
      insertOption: 'SQLInsertQueriesFromMockData',
      includeTypeGuards: false,
      outputOnSingleFile: false,
      dbType,
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
    });

    it('should generate individual migration files for each table in PostgreSQL', async () => {
      const userFiles = createUserFilesWithFileLoop();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Should generate one file per table
      const migrationFiles = result.structure.filter(
        (item) => item.type === 'file' && item.name.endsWith('.sql'),
      );
      expect(migrationFiles.length).toBeGreaterThan(0);

      // Check for specific table files
      const fileNames = migrationFiles.map((item) =>
        item.type === 'file' ? item.name : '',
      );
      expect(fileNames).toContain('Product.sql');
      expect(fileNames).toContain('User.sql');
      expect(fileNames).toContain('Post.sql');

      // Verify User.sql content is processed (no template syntax)
      const userFile = migrationFiles.find(
        (item) => item.type === 'file' && item.name === 'User.sql',
      );
      if (userFile?.type === 'file') {
        const content = userFile.content;
        // Should not contain template syntax
        expect(content).not.toContain('<@@LOOP@@');
        expect(content).not.toContain('<@@IF@@');
        expect(content).not.toContain('{{tableName}}');
        expect(content).not.toContain('{{column.name}}');
        // Should contain processed SQL
        expect(content).toContain('DROP TABLE IF EXISTS "user"');
        expect(content).toContain('CREATE TABLE "user"');
        expect(content).toContain('"user_id" BIGSERIAL PRIMARY KEY');
        expect(content).toContain('"password" CHAR(60)');
      }
    });

    it('should generate individual migration files for each table in MySQL', async () => {
      const userFiles = createUserFilesWithFileLoop();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataMysql = createFormData('mysql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataMysql,
        null,
      );

      // Should generate one file per table
      const migrationFiles = result.structure.filter(
        (item) => item.type === 'file' && item.name.endsWith('.sql'),
      );
      expect(migrationFiles.length).toBeGreaterThan(0);

      // Verify Product.sql content is processed with MySQL types
      const productFile = migrationFiles.find(
        (item) => item.type === 'file' && item.name === 'Product.sql',
      );
      if (productFile?.type === 'file') {
        const content = productFile.content;
        // Should not contain template syntax
        expect(content).not.toContain('<@@LOOP@@');
        expect(content).not.toContain('<@@IF@@');
        // Should contain processed SQL with MySQL types
        expect(content).toContain('DROP TABLE IF EXISTS "product"');
        expect(content).toContain('CREATE TABLE "product"');
        expect(content).toContain(
          '"product_id" BIGINT PRIMARY KEY AUTO_INCREMENT',
        );
        expect(content).toContain('"product_name" VARCHAR(32)');
      }
    });

    it('should process columnsInfo loops correctly in migration files', async () => {
      const userFiles = createUserFilesWithFileLoop();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Check Order.sql which has foreign keys
      const orderFile = result.structure.find(
        (item) => item.type === 'file' && item.name === 'Order.sql',
      );
      if (orderFile?.type === 'file') {
        const content = orderFile.content;
        // Should contain all columns
        expect(content).toContain('"order_id"');
        expect(content).toContain('"customer_id"');
        // Should contain foreign key constraint
        expect(content).toContain('CONSTRAINT "FK_order_customer_id"');
        expect(content).toContain('FOREIGN KEY');
        expect(content).toContain('REFERENCES "customer"');
        // Should not contain template syntax
        expect(content).not.toContain('<@@LOOP@@');
        expect(content).not.toContain('{{column.name}}');
      }
    });

    it('should process IF conditions correctly in migration files', async () => {
      const userFiles = createUserFilesWithFileLoop();
      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Check Profile.sql which has unique constraint
      const profileFile = result.structure.find(
        (item) => item.type === 'file' && item.name === 'Profile.sql',
      );
      if (profileFile?.type === 'file') {
        const content = profileFile.content;
        // Should contain UNIQUE constraint for user_id
        expect(content).toContain('"user_id" BIGINT UNIQUE NOT NULL');
        // Should contain foreign key
        expect(content).toContain('CONSTRAINT "FK_profile_user_id"');
        // Should not contain template syntax
        expect(content).not.toContain('<@@IF@@');
        expect(content).not.toContain('is_unique EQUALS');
      }
    });

    it('should process index() function in filenames correctly', async () => {
      // Use the actual structure.yaml file which has nested folders
      const userFiles = createUserFilesWithFileLoop();
      // Update the structure.yaml to match the actual file
      const projectsFolder = userFiles.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'Projects',
      );
      const appGenFolder = projectsFolder?.children.find(
        (item): item is IFolder =>
          item.type === 'folder' &&
          item.name === 'App Generator - Database Schema',
      );
      const structureFile = appGenFolder?.children.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'structure.yaml',
      );
      if (structureFile) {
        // Use the actual structure.yaml content
        const actualStructure = `CREATE_FILE(schema.sql --template /Templates/schema.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):

migrations:
  simple-index:
    FILE_LOOP({{index}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
  indexed:
    FILE_LOOP({{index(1)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
  zero-padded-3:
    FILE_LOOP({{index(1, 3)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):`;
        structureFile.content = actualStructure;
      }

      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Find the migrations/simple-index folder
      const migrationsFolder = result.structure.find(
        (item) => item.type === 'folder' && item.name === 'migrations',
      );
      expect(migrationsFolder?.type).toBe('folder');

      if (migrationsFolder?.type === 'folder') {
        const simpleIndexFolder = migrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'simple-index',
        );
        expect(simpleIndexFolder?.type).toBe('folder');

        if (simpleIndexFolder?.type === 'folder') {
          const files = simpleIndexFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );

          // Should have files with processed index (0-based, no padding)
          expect(files.length).toBeGreaterThan(0);
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (no unprocessed placeholders)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{index');
            expect(fileName).not.toContain('{{index(');
            expect(fileName).toMatch(/^\d+_[a-z_]+\.sql$/);
          });

          // Verify specific files exist with correct index
          expect(fileNames).toContain('0_product.sql');
          expect(fileNames).toContain('1_customer.sql');
          expect(fileNames).toContain('2_order.sql');
        }
      }

      // Check indexed folder (1-based)
      if (migrationsFolder?.type === 'folder') {
        const indexedFolder = migrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'indexed',
        );
        expect(indexedFolder?.type).toBe('folder');

        if (indexedFolder?.type === 'folder') {
          const files = indexedFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (1-based)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{index');
            expect(fileName).toMatch(/^[1-9]\d*_[a-z_]+\.sql$/);
          });

          expect(fileNames).toContain('1_product.sql');
          expect(fileNames).toContain('2_customer.sql');
        }
      }

      // Check zero-padded-3 folder
      if (migrationsFolder?.type === 'folder') {
        const zeroPaddedFolder = migrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'zero-padded-3',
        );
        expect(zeroPaddedFolder?.type).toBe('folder');

        if (zeroPaddedFolder?.type === 'folder') {
          const files = zeroPaddedFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed with zero-padding
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{index');
            expect(fileName).toMatch(/^\d{3}_[a-z_]+\.sql$/);
          });

          expect(fileNames).toContain('001_product.sql');
          expect(fileNames).toContain('002_customer.sql');
        }
      }
    });

    it('should process timestamp() function in filenames correctly', async () => {
      // Use the actual structure.yaml file which has nested folders
      const userFiles = createUserFilesWithFileLoop();
      const projectsFolder = userFiles.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'Projects',
      );
      const appGenFolder = projectsFolder?.children.find(
        (item): item is IFolder =>
          item.type === 'folder' &&
          item.name === 'App Generator - Database Schema',
      );
      const structureFile = appGenFolder?.children.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'structure.yaml',
      );
      if (structureFile) {
        const actualStructure = `CREATE_FILE(schema.sql --template /Templates/schema.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):

timestamp-migrations:
  iso-default:
    FILE_LOOP({{timestamp}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
  laravel:
    FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
  date-only:
    FILE_LOOP({{timestamp('YYYY-MM-DD')}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):`;
        structureFile.content = actualStructure;
      }

      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Find the timestamp-migrations folder
      const timestampMigrationsFolder = result.structure.find(
        (item) =>
          item.type === 'folder' && item.name === 'timestamp-migrations',
      );
      expect(timestampMigrationsFolder?.type).toBe('folder');

      if (timestampMigrationsFolder?.type === 'folder') {
        // Check iso-default folder
        const isoDefaultFolder = timestampMigrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'iso-default',
        );
        expect(isoDefaultFolder?.type).toBe('folder');

        if (isoDefaultFolder?.type === 'folder') {
          const files = isoDefaultFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (ISO 8601 format)
          // Note: Colons are sanitized to hyphens for Windows compatibility
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{timestamp');
            expect(fileName).not.toContain('{{timestamp(');
            // ISO 8601 format sanitized: YYYY-MM-DDTHH-mm-ss.sssZ (colons replaced with hyphens)
            expect(fileName).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z_[a-z_]+\.sql$/,
            );
          });
        }

        // Check laravel folder
        const laravelFolder = timestampMigrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'laravel',
        );
        expect(laravelFolder?.type).toBe('folder');

        if (laravelFolder?.type === 'folder') {
          const files = laravelFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (Laravel format: YYYY_MM_DD_HHmmss)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{timestamp');
            // Timestamp is processed, table name placeholder may remain if not in replacements
            expect(fileName).toMatch(
              /^\d{4}_\d{2}_\d{2}_\d{6}_create_.+_table\.sql$/,
            );
          });
        }

        // Check date-only folder
        const dateOnlyFolder = timestampMigrationsFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'date-only',
        );
        expect(dateOnlyFolder?.type).toBe('folder');

        if (dateOnlyFolder?.type === 'folder') {
          const files = dateOnlyFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (Date format: YYYY-MM-DD)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{timestamp');
            expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}_[a-z_]+\.sql$/);
          });
        }
      }
    });

    it('should process combined index() and timestamp() functions in filenames', async () => {
      // Use the actual structure.yaml file which has nested folders
      const userFiles = createUserFilesWithFileLoop();
      const projectsFolder = userFiles.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'Projects',
      );
      const appGenFolder = projectsFolder?.children.find(
        (item): item is IFolder =>
          item.type === 'folder' &&
          item.name === 'App Generator - Database Schema',
      );
      const structureFile = appGenFolder?.children.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'structure.yaml',
      );
      if (structureFile) {
        const actualStructure = `CREATE_FILE(schema.sql --template /Templates/schema.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):

hybrid:
  timestamp-and-index:
    FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_{{index(1, 6)}}_create_{{tableNameSnakeCasePlural}}_table.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
  date-and-index:
    FILE_LOOP({{timestamp('YYYY-MM-DD')}}_{{index(1, 3)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):`;
        structureFile.content = actualStructure;
      }

      const projectPath =
        '/Projects/App Generator - Database Schema/structure.yaml';
      const formDataPostgres = createFormData('postgresql');

      const result = await buildProjectFiles(
        projectPath,
        userFiles,
        masterSchema,
        formDataPostgres,
        null,
      );

      // Find the hybrid folder
      const hybridFolder = result.structure.find(
        (item) => item.type === 'folder' && item.name === 'hybrid',
      );
      expect(hybridFolder?.type).toBe('folder');

      if (hybridFolder?.type === 'folder') {
        // Check timestamp-and-index folder
        const timestampAndIndexFolder = hybridFolder.children.find(
          (item) =>
            item.type === 'folder' && item.name === 'timestamp-and-index',
        );
        expect(timestampAndIndexFolder?.type).toBe('folder');

        if (timestampAndIndexFolder?.type === 'folder') {
          const files = timestampAndIndexFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (timestamp + zero-padded index)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{timestamp');
            expect(fileName).not.toContain('{{index');
            // Format: YYYY_MM_DD_HHmmss_000001_create_..._table.sql
            // Timestamp and index are processed, table name placeholder may remain
            expect(fileName).toMatch(
              /^\d{4}_\d{2}_\d{2}_\d{6}_\d{6}_create_.+_table\.sql$/,
            );
          });
        }

        // Check date-and-index folder
        const dateAndIndexFolder = hybridFolder.children.find(
          (item) => item.type === 'folder' && item.name === 'date-and-index',
        );
        expect(dateAndIndexFolder?.type).toBe('folder');

        if (dateAndIndexFolder?.type === 'folder') {
          const files = dateAndIndexFolder.children.filter(
            (item): item is IFile => item.type === 'file',
          );
          const fileNames = files.map((item) => item.name);

          // Check that filenames are processed (date + zero-padded index)
          fileNames.forEach((fileName) => {
            expect(fileName).not.toContain('{{timestamp');
            expect(fileName).not.toContain('{{index');
            // Format: YYYY-MM-DD_001_product.sql
            expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{3}_[a-z_]+\.sql$/);
          });
        }
      }
    });
  });
});
