import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins.ts';
import { beforeEach, describe, it, expect } from 'vitest';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';
import manyToMany from '@/schema-infos/manyToMany.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';
import { useFormStore } from '@/useFormStore.ts';

describe('generateSQLAggregateJoins', () => {
  const POSSchemaInfo = manyToMany;
  const userPostsOneToManySchemaInfo = oneToMany;

  beforeEach(() => {
    useFormStore.setState({ quote: '"' });
  });

  it('should generate correct SQL JOIN queries for POS schema', () => {
    const joinQueries = generateSQLAggregateJoins(POSSchemaInfo).join('');
    expect(joinQueries).toContain(
      `SELECT "customer".*, COALESCE(json_agg("order".*) FILTER (WHERE "order".customer_id IS NOT NULL), '[]') AS orders FROM "customer" LEFT JOIN "order" ON "customer".customer_id = "order".customer_id GROUP BY "customer".customer_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT "order".*, COALESCE(json_agg("order_product".*) FILTER (WHERE "order_product".order_id IS NOT NULL), '[]') AS order_products FROM "order" LEFT JOIN "order_product" ON "order".order_id = "order_product".order_id GROUP BY "order".order_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT "product".*, COALESCE(json_agg("order_product".*) FILTER (WHERE "order_product".product_id IS NOT NULL), '[]') AS order_products FROM "product" LEFT JOIN "order_product" ON "product".product_id = "order_product".product_id GROUP BY "product".product_id;`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostsOneToManySchema', () => {
    const joinQueries = generateSQLAggregateJoins(
      userPostsOneToManySchemaInfo,
    ).join('');
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT "user".*, COALESCE(json_agg("post".*) FILTER (WHERE "post".user_id IS NOT NULL), '[]') AS posts FROM "user" LEFT JOIN "post" ON "user".user_id = "post".user_id GROUP BY "user".user_id;`,
    );
  });
});
