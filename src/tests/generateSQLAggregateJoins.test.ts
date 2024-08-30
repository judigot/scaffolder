import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';

describe('generateSQLAggregateJoins', () => {
  const POSSchemaInfo = identifySchema(POSSchema);
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );

  it('should generate correct SQL JOIN queries for POS schema', () => {
    const joinQueries = generateSQLAggregateJoins(POSSchemaInfo);
    expect(joinQueries).toContain(
      `SELECT "customer".*, json_agg("order".*) AS order_data FROM "customer" LEFT JOIN "order" ON "customer"."customer_id" = "order"."customer_id" GROUP BY "customer"."customer_id";`,
    );
    expect(joinQueries).toContain(
      `SELECT "order".*, json_agg("order_product".*) AS order_product_data FROM "order" LEFT JOIN "order_product" ON "order"."order_id" = "order_product"."order_id" GROUP BY "order"."order_id";`,
    );
    expect(joinQueries).toContain(
      `SELECT "product".*, json_agg("order_product".*) AS order_product_data FROM "product" LEFT JOIN "order_product" ON "product"."product_id" = "order_product"."product_id" GROUP BY "product"."product_id";`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostOneToOneSchema', () => {
    const joinQueries = generateSQLAggregateJoins(userPostOneToOneSchemaInfo);
    expect(joinQueries).toContain(
      `SELECT "post".*, json_agg("user".*) AS user_data FROM "post" LEFT JOIN "user" ON "post"."user_id" = "user"."user_id" GROUP BY "post"."post_id";`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostsOneToManySchema', () => {
    const joinQueries = generateSQLAggregateJoins(userPostsOneToManySchemaInfo);
    expect(joinQueries).toContain(
      `SELECT "post".*, json_agg("user".*) AS user_data FROM "post" LEFT JOIN "user" ON "post"."user_id" = "user"."user_id" GROUP BY "post"."post_id";`,
    );
  });
});
