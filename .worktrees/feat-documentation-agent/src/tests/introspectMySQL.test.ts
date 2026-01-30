import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { masterSchema } from '@/schema-infos/masterSchema.ts';
import { masterSchemaWithId } from '@/schema-infos/masterSchemaWithId.ts';
import { normalizeSchema } from '@/tests/helpers/normalizeSchema.ts';
import {
  createAndIntrospectDatabase,
  getTestConnectionString,
  checkDatabaseConnection,
} from '@/tests/helpers/introspectTestHelpers.ts';
import {
  setupTypeMappings,
  teardownTypeMappings,
} from '@/tests/helpers/setupTypeMappings.ts';

const isMySQLAvailable = await checkDatabaseConnection('mysql');

describe.skipIf(!isMySQLAvailable)('Introspection Test - MySQL', () => {
  const dbConnection = getTestConnectionString('mysql');

  beforeAll(() => {
    setupTypeMappings();
  });

  afterAll(() => {
    teardownTypeMappings();
  });

  beforeEach(() => {
    /* Ensure type mappings are set up before each test */
    setupTypeMappings();
  });

  afterEach(() => {
    /* Clean up after each test */
    teardownTypeMappings();
  });

  it('should introspect database and match original schema exactly', async () => {
    /* Create database from masterSchema and introspect */
    const introspectedSchema = await createAndIntrospectDatabase(
      masterSchema,
      dbConnection,
    );

    /* Normalize both schemas for deterministic comparison */
    const normalizedOriginal = normalizeSchema(masterSchema);
    const normalizedIntrospected = normalizeSchema(introspectedSchema);

    /* Verify exact match */
    expect(normalizedIntrospected).toEqual(normalizedOriginal);
  }, 30000);

  it('should correctly identify primary keys from database introspection', async () => {
    /* Create database from masterSchema and introspect */
    const introspectedSchema = await createAndIntrospectDatabase(
      masterSchema,
      dbConnection,
    );

    /* Verify primary keys are correctly identified */
    for (const originalTable of masterSchema) {
      const introspectedTable = introspectedSchema.find(
        (t) => t.tableName === originalTable.tableName,
      );

      expect(introspectedTable).toBeDefined();
      expect(introspectedTable).not.toBeUndefined();

      if (introspectedTable) {
        const originalPrimaryKeyColumn = originalTable.columnsInfo.find(
          (col) => col.primary_key,
        );

        if (originalPrimaryKeyColumn) {
          const introspectedPrimaryKeyColumn =
            introspectedTable.columnsInfo.find((col) => col.primary_key);

          expect(introspectedPrimaryKeyColumn).toBeDefined();
          expect(introspectedPrimaryKeyColumn).not.toBeUndefined();

          if (introspectedPrimaryKeyColumn) {
            /* Verify primary key column name matches exactly (not tableName + "_id") */
            expect(introspectedPrimaryKeyColumn.column_name).toBe(
              originalPrimaryKeyColumn.column_name,
            );

            /* Verify it's marked as primary key */
            expect(introspectedPrimaryKeyColumn.primary_key).toBe(true);

            /* Verify AUTO_INCREMENT is normalized */
            expect(introspectedPrimaryKeyColumn.column_default).toBe(
              'AUTO_INCREMENT',
            );
          }
        }
      }
    }
  }, 30000);

  it('should preserve all relationship fields from introspection', async () => {
    /* Create database from masterSchema and introspect */
    const introspectedSchema = await createAndIntrospectDatabase(
      masterSchema,
      dbConnection,
    );

    /* Normalize both schemas */
    const normalizedOriginal = normalizeSchema(masterSchema);
    const normalizedIntrospected = normalizeSchema(introspectedSchema);

    /* Verify relationship fields are preserved */
    for (const originalTable of normalizedOriginal) {
      const introspectedTable = normalizedIntrospected.find(
        (t) => t.tableName === originalTable.tableName,
      );

      expect(introspectedTable).toBeDefined();
      expect(introspectedTable).not.toBeUndefined();

      if (introspectedTable) {
        /* Verify all relationship arrays match */
        expect(introspectedTable.hasOne).toEqual(originalTable.hasOne);
        expect(introspectedTable.hasMany).toEqual(originalTable.hasMany);
        expect(introspectedTable.belongsTo).toEqual(originalTable.belongsTo);
        expect(introspectedTable.belongsToMany).toEqual(
          originalTable.belongsToMany,
        );
        expect(introspectedTable.childTables).toEqual(
          originalTable.childTables,
        );
        expect(introspectedTable.foreignTables).toEqual(
          originalTable.foreignTables,
        );
        expect(introspectedTable.foreignKeys).toEqual(
          originalTable.foreignKeys,
        );
        expect(introspectedTable.pivotRelationships).toEqual(
          originalTable.pivotRelationships,
        );
        expect(introspectedTable.isPivot).toBe(originalTable.isPivot);
      }
    }
  }, 30000);

  it('should introspect database with "id" primary keys and match original schema exactly', async () => {
    /* Create database from masterSchemaWithId and introspect */
    const introspectedSchema = await createAndIntrospectDatabase(
      masterSchemaWithId,
      dbConnection,
    );

    /* Normalize both schemas for deterministic comparison */
    const normalizedOriginal = normalizeSchema(masterSchemaWithId);
    const normalizedIntrospected = normalizeSchema(introspectedSchema);

    /* Verify exact match */
    expect(normalizedIntrospected).toEqual(normalizedOriginal);
  }, 30000);

  it('should correctly identify "id" primary keys from database introspection', async () => {
    /* Create database from masterSchemaWithId and introspect */
    const introspectedSchema = await createAndIntrospectDatabase(
      masterSchemaWithId,
      dbConnection,
    );

    /* Verify primary keys named "id" are correctly identified */
    for (const originalTable of masterSchemaWithId) {
      const introspectedTable = introspectedSchema.find(
        (t) => t.tableName === originalTable.tableName,
      );

      expect(introspectedTable).toBeDefined();
      expect(introspectedTable).not.toBeUndefined();

      if (introspectedTable) {
        const originalPrimaryKeyColumn = originalTable.columnsInfo.find(
          (col) => col.primary_key,
        );

        if (originalPrimaryKeyColumn) {
          const introspectedPrimaryKeyColumn =
            introspectedTable.columnsInfo.find((col) => col.primary_key);

          expect(introspectedPrimaryKeyColumn).toBeDefined();
          expect(introspectedPrimaryKeyColumn).not.toBeUndefined();

          if (introspectedPrimaryKeyColumn) {
            /* Verify primary key column name is "id" (not tableName + "_id") */
            expect(introspectedPrimaryKeyColumn.column_name).toBe(
              originalPrimaryKeyColumn.column_name,
            );
            expect(introspectedPrimaryKeyColumn.column_name).toBe('id');

            /* Verify it's marked as primary key */
            expect(introspectedPrimaryKeyColumn.primary_key).toBe(true);

            /* Verify AUTO_INCREMENT is normalized */
            expect(introspectedPrimaryKeyColumn.column_default).toBe(
              'AUTO_INCREMENT',
            );
          }
        }
      }
    }
  }, 30000);
});
