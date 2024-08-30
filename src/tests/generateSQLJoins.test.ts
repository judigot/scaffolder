import generateSQLJoins from '@/utils/generateSQLJoins';
import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';

describe('generateSQLJoins', () => {
  const POSSchemaInfo = identifySchema(POSSchema);
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );

  it('should generate correct SQL JOIN queries for POS schema', () => {
    const joinQueries = generateSQLJoins(POSSchemaInfo);
    expect(joinQueries).toContain(
      `SELECT * FROM "order" JOIN "customer" ON "order".customer_id = "customer".customer_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "customer" JOIN "order" ON "customer".customer_id = "order".customer_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "order_product" JOIN "order" ON "order_product".order_id = "order".order_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "order" JOIN "order_product" ON "order".order_id = "order_product".order_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "order_product" JOIN "product" ON "order_product".product_id = "product".product_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "product" JOIN "order_product" ON "product".product_id = "order_product".product_id;`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostOneToOneSchema', () => {
    const joinQueries = generateSQLJoins(userPostOneToOneSchemaInfo);
    expect(joinQueries).toContain(
      `SELECT * FROM "post" JOIN "user" ON "post".user_id = "user".user_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "user" JOIN "post" ON "user".user_id = "post".user_id;`,
    );
  });

  it('should generate correct SQL JOIN queries for usersPostsOneToManySchema', () => {
    const joinQueries = generateSQLJoins(userPostsOneToManySchemaInfo);
    expect(joinQueries).toContain(
      `SELECT * FROM "post" JOIN "user" ON "post".user_id = "user".user_id;`,
    );
    expect(joinQueries).toContain(
      `SELECT * FROM "user" JOIN "post" ON "user".user_id = "post".user_id;`,
    );
  });
});
