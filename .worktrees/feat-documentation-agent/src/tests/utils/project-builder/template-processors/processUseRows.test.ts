import { describe, it, expect } from 'vitest';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';
import generateMockData from '@/utils/generateMockData.ts';

describe('USE_ROWS template command', () => {
  const createSchemaWithSeedData = (): ISchemaInfo[] => [
    {
      tableName: 'user_types',
      columnsInfo: [
        {
          column_name: 'id',
          data_type: 'number',
          primary_key: true,
          is_nullable: 'NO',
        },
        {
          column_name: 'name',
          data_type: 'string',
          is_nullable: 'NO',
        },
        {
          column_name: 'description',
          data_type: 'string',
          is_nullable: 'YES',
        },
      ],
      childTables: ['users'],
      data: [
        { id: 1, name: 'admin', description: 'Administrator' },
        { id: 2, name: 'user', description: 'Regular user' },
        { id: 3, name: 'guest', description: 'Guest user' },
      ],
    },
    {
      tableName: 'users',
      columnsInfo: [
        {
          column_name: 'id',
          data_type: 'number',
          primary_key: true,
          is_nullable: 'NO',
        },
        {
          column_name: 'email',
          data_type: 'string',
          is_nullable: 'NO',
        },
        {
          column_name: 'name',
          data_type: 'string',
          is_nullable: 'YES',
        },
        {
          column_name: 'user_type_id',
          data_type: 'number',
          is_nullable: 'NO',
          foreign_key: {
            foreign_table_name: 'user_types',
            foreign_column_name: 'id',
          },
        },
      ],
      data: [
        {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          user_type_id: 1,
        },
        {
          id: 2,
          email: 'demo@example.com',
          name: 'Demo User',
          user_type_id: 2,
        },
      ],
    },
  ];

  const createUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'Projects',
      children: [],
    },
  ];

  const createFormData = (): IFormStore => ({
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
    setQuote: (): void => {
      /* stub */
    },
    setFramework: (): void => {
      /* stub */
    },
    setBackendUrl: (): void => {
      /* stub */
    },
    setBackendDir: (): void => {
      /* stub */
    },
    setFrontendDir: (): void => {
      /* stub */
    },
    setDbConnection: (): void => {
      /* stub */
    },
    setDBUsername: (): void => {
      /* stub */
    },
    setDBPassword: (): void => {
      /* stub */
    },
    setDBHost: (): void => {
      /* stub */
    },
    setDBPort: (): void => {
      /* stub */
    },
    setDBName: (): void => {
      /* stub */
    },
    setIncludeInsertData: (): void => {
      /* stub */
    },
    setInsertOption: (): void => {
      /* stub */
    },
    setIncludeTypeGuards: (): void => {
      /* stub */
    },
    setOutputOnSingleFile: (): void => {
      /* stub */
    },
    setPublicRepoURL: (): void => {
      /* stub */
    },
    setClientID: (): void => {
      /* stub */
    },
    setClientSecret: (): void => {
      /* stub */
    },
  });

  /* Create mockData from schema (seed data takes priority) */
  const createMockData = (schema: ISchemaInfo[]): ParsedJSONSchema => {
    // Generate mock data for all tables
    const mockData = generateMockData({ mockDataRows: 3, schemaInfo: schema });

    // Override with seed data where available
    schema.forEach((table) => {
      if (table.data && Array.isArray(table.data) && table.data.length > 0) {
        mockData[table.tableName] = table.data;
      }
    });

    return mockData;
  };

  describe('SQL format (default)', () => {
    it('should generate SQL INSERT for single table with seed data', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('INSERT INTO "user_types"');
      expect(result).toContain("(1, 'admin', 'Administrator')");
      expect(result).toContain("(2, 'user', 'Regular user')");
      expect(result).toContain("(3, 'guest', 'Guest user')");
    });

    it('should generate SQL INSERT for all tables in dependency order', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);

      const template = '[[USE_ROWS()]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        undefined,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should include both tables
      expect(result).toContain('INSERT INTO "user_types"');
      expect(result).toContain('INSERT INTO "users"');

      // user_types should come before users (dependency order)
      const userTypesIndex = result.indexOf('INSERT INTO "user_types"');
      const usersIndex = result.indexOf('INSERT INTO "users"');
      expect(userTypesIndex).toBeLessThan(usersIndex);
    });

    it('should use current table context when no tableName specified', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS()]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('INSERT INTO "user_types"');
    });

    it('should generate mock data when table has no seed data', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'empty_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              primary_key: true,
              is_nullable: 'NO',
            },
            {
              column_name: 'name',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
          // No data property - should fall back to mock data
        },
      ];
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema[0];

      const template = '[[USE_ROWS(tableName=empty_table)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should generate mock data (3 rows by default)
      expect(result).toContain('INSERT INTO "empty_table"');
      expect(result).toContain('(1,'); // First row starts with id=1
    });

    it('should handle rows parameter to limit output', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types, rows=2)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should only contain first 2 rows
      expect(result).toContain("(1, 'admin', 'Administrator')");
      expect(result).toContain("(2, 'user', 'Regular user')");
      expect(result).not.toContain("(3, 'guest', 'Guest user')");
    });

    it('should handle offset parameter', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types, rows=1, offset=1)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should skip first row and only show second
      expect(result).not.toContain("(1, 'admin', 'Administrator')");
      expect(result).toContain("(2, 'user', 'Regular user')");
      expect(result).not.toContain("(3, 'guest', 'Guest user')");
    });
  });

  describe('CSV format', () => {
    it('should generate CSV format for single table', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types, format=csv)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('user_types');
      expect(result).toContain('id,name,description');
      expect(result).toContain('1,admin,Administrator');
      expect(result).toContain('2,user,Regular user');
    });

    it('should include headers by default', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types, format=csv)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('id,name,description');
    });

    it('should exclude headers when includeHeaders=false', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template =
        '[[USE_ROWS(tableName=user_types, format=csv, includeHeaders=false)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).not.toContain('id,name,description');
      expect(result).toContain('1,admin,Administrator');
    });

    it('should support custom delimiter', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template =
        '[[USE_ROWS(tableName=user_types, format=csv, delimiter=;)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('id;name;description');
      expect(result).toContain('1;admin;Administrator');
    });
  });

  describe('JSON format', () => {
    it('should generate JSON format for single table', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template = '[[USE_ROWS(tableName=user_types, format=json)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      const parsed: unknown = JSON.parse(result);
      expect(parsed).toHaveProperty('user_types');
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'user_types' in parsed &&
        Array.isArray(parsed.user_types)
      ) {
        expect(parsed.user_types).toHaveLength(3);
        expect(parsed.user_types[0]).toEqual({
          id: 1,
          name: 'admin',
          description: 'Administrator',
        });
      }
    });

    it('should generate pretty JSON when pretty=true', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema.find((t) => t.tableName === 'user_types');

      const template =
        '[[USE_ROWS(tableName=user_types, format=json, pretty=true)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Pretty JSON should have newlines
      expect(result).toContain('\n');
      expect(result).toContain('  '); // Indentation

      // Should still be valid JSON
      const parsed: unknown = JSON.parse(result);
      expect(parsed).toHaveProperty('user_types');
    });

    it('should generate JSON for all tables', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);

      const template = '[[USE_ROWS(format=json)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        undefined,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      const parsed: unknown = JSON.parse(result);
      expect(parsed).toHaveProperty('user_types');
      expect(parsed).toHaveProperty('users');
    });
  });

  describe('Seed data priority over mock data', () => {
    it('should use seed data when available', () => {
      const schema = createSchemaWithSeedData();
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);

      const template = '[[USE_ROWS(tableName=user_types)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        undefined,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should use seed data, not mock data
      expect(result).toContain("'admin'");
      expect(result).toContain("'Administrator'");
    });

    it('should fall back to mock data when no seed data', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'no_seed_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              primary_key: true,
              is_nullable: 'NO',
            },
            {
              column_name: 'name',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
          // No data property
        },
      ];
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);

      const template = '[[USE_ROWS(tableName=no_seed_table)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        undefined,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should generate mock data
      expect(result).toContain('INSERT INTO "no_seed_table"');
      expect(result).toContain('(1,'); // Mock data starts with id=1
    });
  });

  describe('Edge cases', () => {
    it('should handle null values in seed data', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'test_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              primary_key: true,
              is_nullable: 'NO',
            },
            {
              column_name: 'nullable_field',
              data_type: 'string',
              is_nullable: 'YES',
            },
          ],
          data: [{ id: 1, nullable_field: null }],
        },
      ];
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema[0];

      const template = '[[USE_ROWS(tableName=test_table)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      expect(result).toContain('NULL');
    });

    it('should handle special characters in string values', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'test_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              primary_key: true,
              is_nullable: 'NO',
            },
            {
              column_name: 'name',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
          data: [{ id: 1, name: "O'Reilly" }],
        },
      ];
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema[0];

      const template = '[[USE_ROWS(tableName=test_table)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should escape single quotes in SQL
      expect(result).toContain("'O''Reilly'");
    });

    it('should generate mock data when seed data array is empty', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'empty_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              primary_key: true,
              is_nullable: 'NO',
            },
            {
              column_name: 'name',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
          data: [],
        },
      ];
      const schemaInfoParsed = getSchemaInfo(schema);
      const userFiles = createUserFiles();
      const formData = createFormData();
      const mockData = createMockData(schema);
      const table = schema[0];

      const template = '[[USE_ROWS(tableName=empty_table)]]';
      const result = processCommand(
        template,
        userFiles,
        schemaInfoParsed,
        table,
        undefined,
        undefined,
        formData,
        undefined,
        undefined,
        false,
        mockData,
      );

      // Should fall back to mock data
      expect(result).toContain('INSERT INTO "empty_table"');
    });
  });
});
