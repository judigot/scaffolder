import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { normalizeWhitespace } from '@/helpers/stringHelper';
import generateSQLDirectJoins from '@/utils/generateSQLDirectJoins';

describe('generateSQLDirectJoins', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

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
