import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { masterSchema } from '@/schema-infos/masterSchema.ts';
import { masterSchemaWithId } from '@/schema-infos/masterSchemaWithId.ts';
import {
  checkDatabaseConnection,
  createAndIntrospectDatabase,
  getTestConnectionString,
} from '@/tests/helpers/introspectTestHelpers.ts';
import { normalizeSchema } from '@/tests/helpers/normalizeSchema.ts';
import {
  setupTypeMappings,
  teardownTypeMappings,
} from '@/tests/helpers/setupTypeMappings.ts';

const isPostgresAvailable = await checkDatabaseConnection('postgresql');
const isMySQLAvailable = await checkDatabaseConnection('mysql');

describe.skipIf(!(isPostgresAvailable && isMySQLAvailable))(
  'Introspection Parity Test - PostgreSQL vs MySQL',
  () => {
    const postgresConnection = getTestConnectionString('postgresql');
    const mysqlConnection = getTestConnectionString('mysql');

    beforeAll(() => {
      setupTypeMappings();
    });

    afterAll(() => {
      teardownTypeMappings();
    });

    beforeEach(() => {
      setupTypeMappings();
    });

    afterEach(() => {
      teardownTypeMappings();
    });

    it('should produce matching schemaInfo for masterSchema', async () => {
      const postgresSchema = await createAndIntrospectDatabase(
        masterSchema,
        postgresConnection,
      );
      const mysqlSchema = await createAndIntrospectDatabase(
        masterSchema,
        mysqlConnection,
      );

      const normalizedPostgres = normalizeSchema(postgresSchema);
      const normalizedMySQL = normalizeSchema(mysqlSchema);

      expect(normalizedMySQL).toEqual(normalizedPostgres);
    }, 60000);

    it('should produce matching schemaInfo for masterSchemaWithId', async () => {
      const postgresSchema = await createAndIntrospectDatabase(
        masterSchemaWithId,
        postgresConnection,
      );
      const mysqlSchema = await createAndIntrospectDatabase(
        masterSchemaWithId,
        mysqlConnection,
      );

      const normalizedPostgres = normalizeSchema(postgresSchema);
      const normalizedMySQL = normalizeSchema(mysqlSchema);

      expect(normalizedMySQL).toEqual(normalizedPostgres);
    }, 60000);
  },
);
