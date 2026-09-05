import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import manyToMany from '@/schema-infos/manyToMany.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';
import oneToOne from '@/schema-infos/oneToOne.ts';
import {
  setupFormStore,
  getTestConnectionString,
} from '@/tests/helpers/introspectTestHelpers.ts';

describe('generateSQLDeleteTables', () => {
  beforeEach(() => {
    setupFormStore(getTestConnectionString('postgresql'));
  });

  const userPostOneToOneSchemaInfo = oneToOne;
  const userPostsOneToManySchemaInfo = oneToMany;
  const POSSchemaInfo = manyToMany;

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
