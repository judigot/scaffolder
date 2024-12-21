import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import identifySchema from '@/utils/identifySchema.ts';
import { describe, it, expect } from 'vitest';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
} from '@/json-schemas/index.ts';

describe('generateSQLDeleteTables', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct SQL DROP TABLE statements for one-to-one relationship', () => {
    const deleteTablesQueries = generateSQLDeleteTables(
      userPostOneToOneSchemaInfo,
    );
    expect(deleteTablesQueries).toEqual([
      'DROP TABLE IF EXISTS "post";',
      'DROP TABLE IF EXISTS "user";',
    ]);
  });

  it('should generate correct SQL DROP TABLE statements for one-to-many relationship', () => {
    const deleteTablesQueries = generateSQLDeleteTables(
      userPostsOneToManySchemaInfo,
    );
    expect(deleteTablesQueries).toEqual([
      'DROP TABLE IF EXISTS "post";',
      'DROP TABLE IF EXISTS "user";',
    ]);
  });

  it('should generate correct SQL DROP TABLE statements for POS', () => {
    const deleteTablesQueries = generateSQLDeleteTables(POSSchemaInfo);
    expect(deleteTablesQueries).toEqual([
      'DROP TABLE IF EXISTS "order_product";',
      'DROP TABLE IF EXISTS "order";',
      'DROP TABLE IF EXISTS "customer";',
      'DROP TABLE IF EXISTS "product";',
    ]);
  });
});
