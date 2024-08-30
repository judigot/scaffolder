import generateSQLInserts from '@/utils/generateSQLInserts';
import { describe, it, expect } from 'vitest';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';

describe('generateSQLInserts', () => {
  it('should generate correct SQL INSERT statements for POS schema', () => {
    const sqlInserts = generateSQLInserts(POSSchema);
    expect(sqlInserts).toContain(
      `INSERT INTO "product" (product_id, product_name) VALUES (1, 'Water'),(2, 'Yogurt');`,
    );
    expect(sqlInserts).toContain(
      `INSERT INTO "customer" (customer_id, name) VALUES (1, 'John Doe'),(2, 'Jane Doe');`,
    );
    expect(sqlInserts).toContain(
      `INSERT INTO "order" (order_id, customer_id) VALUES (1, 1),(2, 1),(3, 2);`,
    );
    expect(sqlInserts).toContain(
      `INSERT INTO "order_product" (order_product_id, order_id, product_id) VALUES (1, 1, 1),(2, 1, 2),(3, 2, 2);`,
    );
  });

  it('should generate correct SQL INSERT statements for usersPostOneToOneSchema', () => {
    const sqlInserts = generateSQLInserts(usersPostOneToOneSchema);
    expect(sqlInserts).toContain(
      `INSERT INTO "user" (user_id, first_name, last_name, email, username, password, created_at, updated_at) VALUES (1, 'John', 'Doe', 'john.doe@example.com', 'johndoe', '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m', '2023-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z'),(2, 'Jane', 'Doe', 'jane.doe@example.com', 'janedoe', '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m', '2024-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z');`,
    );
    expect(sqlInserts).toContain(
      `INSERT INTO "post" (post_id, user_id, title, content, created_at, updated_at) VALUES (1, 1, 'John''s Post', 'Lorem ipsum', '2023-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z'),(2, 2, 'Jane''s Post', NULL, '2024-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z');`,
    );
  });

  it('should generate correct SQL INSERT statements for usersPostsOneToManySchema', () => {
    const sqlInserts = generateSQLInserts(usersPostsOneToManySchema);
    expect(sqlInserts).toContain(
      `INSERT INTO "user" (user_id, first_name, last_name, email, username, password, created_at, updated_at) VALUES (1, 'John', 'Doe', 'john.doe@example.com', 'johndoe', '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m', '2023-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z'),(2, 'Jane', 'Doe', 'jane.doe@example.com', 'janedoe', '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m', '2024-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z');`,
    );
    expect(sqlInserts).toContain(
      `INSERT INTO "post" (post_id, user_id, title, content, created_at, updated_at) VALUES (1, 1, 'John''s Post', 'Lorem ipsum', '2023-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z'),(2, 1, 'John''s 2nd Post', 'Lorem ipsum', '2023-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z'),(3, 2, 'Jane''s Post', NULL, '2024-06-18T10:17:19.846Z', '2024-06-18T10:17:19.846Z');`,
    );
  });
});
