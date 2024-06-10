import generateSQLSchema from '@/utils/generateSQLSchema';
import { describe, it, expect } from 'vitest';

describe('generateSQLSchema', () => {
  it('should handle nullable fields correctly and still apply unique constraints', () => {
    const data = {
      product: [
        { product_id: 1, product_name: 'Water', sku: null },
        { product_id: 2, product_name: 'Yogurt', sku: '12345' },
      ],
    };

    const result = generateSQLSchema(data);
    expect(result).toContain('CREATE TABLE "product"');
    expect(result).toContain('product_id BIGSERIAL NOT NULL');
    expect(result).toContain('product_name TEXT NOT NULL');
    expect(result).toContain('sku TEXT NULL');
    expect(result).toContain('PRIMARY KEY (product_id)');
    expect(result).toContain('UNIQUE (sku)');
  });

  it('should generate foreign key constraints', () => {
    const data = {
      order: [{ order_id: 1, customer_id: 1 }],
      customer: [
        { customer_id: 1, email: 'john@example.com', name: 'John Doe' },
      ],
    };

    const result = generateSQLSchema(data);
    expect(result).toContain('CREATE TABLE "customer"');
    expect(result).toContain('CREATE TABLE "order"');
    expect(result).toContain('order_id BIGSERIAL NOT NULL');
    expect(result).toContain('customer_id BIGINT NOT NULL');
    expect(result).toContain('PRIMARY KEY (order_id)');
    expect(result).toContain(
      'CONSTRAINT FK_order_customer_id FOREIGN KEY (customer_id) REFERENCES "customer"(customer_id)',
    );
  });

  it('should generate SQL for multiple tables', () => {
    const data = {
      customer: [
        { customer_id: 1, email: 'john@example.com', name: 'John Doe' },
      ],
      order: [{ order_id: 1, customer_id: 1 }],
    };

    const result = generateSQLSchema(data);
    expect(result).toContain('CREATE TABLE "customer"');
    expect(result).toContain('CREATE TABLE "order"');
  });

  it('should handle cases where the first key does not contain "id"', () => {
    const data = {
      user: [
        { user_id: 1, username: 'john_doe', email: 'john@example.com' },
        { user_id: 2, username: 'jane_doe', email: 'jane@example.com' },
      ],
    };

    const result = generateSQLSchema(data);
    expect(result).toContain('CREATE TABLE "user"');
    expect(result).toContain('user_id BIGSERIAL NOT NULL');
    expect(result).toContain('username TEXT UNIQUE NOT NULL');
    expect(result).toContain('email TEXT UNIQUE NOT NULL');
    expect(result).toContain('PRIMARY KEY (user_id)');
    expect(result).toContain('UNIQUE (username)');
    expect(result).toContain('UNIQUE (email)');
  });

  it('should correctly drop tables before creating them', () => {
    const data = {
      product: [
        { product_id: 1, product_name: 'Water', sku: null },
        { product_id: 2, product_name: 'Yogurt', sku: '12345' },
      ],
    };

    const result = generateSQLSchema(data);
    expect(result).toContain('DROP TABLE IF EXISTS "product" CASCADE;');
    expect(result).toContain('CREATE TABLE "product"');
  });
});
