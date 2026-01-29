import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';
import generateSQLDirectJoins from '@/utils/generateSQLDirectJoins.ts';
import manyToMany from '@/schema-infos/manyToMany.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';
import oneToOne from '@/schema-infos/oneToOne.ts';
import {
  setupFormStore,
  getTestConnectionString,
} from '@/tests/helpers/introspectTestHelpers.ts';

describe('generateSQLDirectJoins', () => {
  beforeEach(() => {
    setupFormStore(getTestConnectionString('postgresql'));
  });

  const userPostOneToOneSchemaInfo = oneToOne;
  const userPostsOneToManySchemaInfo = oneToMany;
  const POSSchemaInfo = manyToMany;

  it('should generate correct SQL JOIN queries for usersPostOneToOneSchema', () => {
    const joinQueries = generateSQLDirectJoins(userPostOneToOneSchemaInfo).join(
      '',
    );
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "user".*, "post".* FROM "user" INNER JOIN "post" ON "post".post_id = "user".user_id;`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostsOneToManySchema', () => {
    const joinQueries = generateSQLDirectJoins(
      userPostsOneToManySchemaInfo,
    ).join('');
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "user".*, "post".* FROM "user" INNER JOIN "post" ON "post".post_id = "user".user_id;`,
    );
  });

  it('should generate correct SQL JOIN queries for POS schema', () => {
    const joinQueries = generateSQLDirectJoins(POSSchemaInfo).join('');
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "product".*, "order_product".* FROM "product" INNER JOIN "order_product" ON "order_product".order_product_id = "product".product_id;`,
    );
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "customer".*, "order".* FROM "customer" INNER JOIN "order" ON "order".order_id = "customer".customer_id;`,
    );
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "order".*, "order_product".* FROM "order" INNER JOIN "order_product" ON "order_product".order_product_id = "order".order_id;`,
    );
  });
});
