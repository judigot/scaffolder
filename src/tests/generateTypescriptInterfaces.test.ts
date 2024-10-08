import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';
import { normalizeWhitespace } from '@/helpers/toPascalCase';

describe('generateTypescriptInterfaces', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct TypeScript interfaces and type guards for one-to-one relationship', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: userPostOneToOneSchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });

    const expectedOutput = `
export interface IUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export function isIUser(data: unknown): data is IUser {
  return (
    data !== null &&
    typeof data === 'object' &&
    'user_id' in data &&
    'first_name' in data &&
    'last_name' in data &&
    'email' in data &&
    'username' in data &&
    'password' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.user_id === 'number' &&
    typeof data.first_name === 'string' &&
    typeof data.last_name === 'string' &&
    typeof data.email === 'string' &&
    typeof data.username === 'string' &&
    typeof data.password === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIUserArray(data: unknown): data is IUser[] {
  return Array.isArray(data) && data.every(isIUser);
}

export interface IPost {
  post_id: number;
  user_id: number;
  title: string;
  content: string | null;
  created_at: Date;
  updated_at: Date;
}

export function isIPost(data: unknown): data is IPost {
  return (
    data !== null &&
    typeof data === 'object' &&
    'post_id' in data &&
    'user_id' in data &&
    'title' in data &&
    'content' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.post_id === 'number' &&
    typeof data.user_id === 'number' &&
    typeof data.title === 'string' &&
    (data.content === null || typeof data.content === 'string') &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIPostArray(data: unknown): data is IPost[] {
  return Array.isArray(data) && data.every(isIPost);
}`;

    if (typeof tsInterfaces === 'string') {
      expect(normalizeWhitespace(tsInterfaces)).toStrictEqual(
        normalizeWhitespace(expectedOutput),
      );
    }
  });

  it('should generate correct TypeScript interfaces and type guards for one-to-many relationship', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: userPostsOneToManySchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });

    const expectedOutput = `
export interface IUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export function isIUser(data: unknown): data is IUser {
  return (
    data !== null &&
    typeof data === 'object' &&
    'user_id' in data &&
    'first_name' in data &&
    'last_name' in data &&
    'email' in data &&
    'username' in data &&
    'password' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.user_id === 'number' &&
    typeof data.first_name === 'string' &&
    typeof data.last_name === 'string' &&
    typeof data.email === 'string' &&
    typeof data.username === 'string' &&
    typeof data.password === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIUserArray(data: unknown): data is IUser[] {
  return Array.isArray(data) && data.every(isIUser);
}

export interface IPost {
  post_id: number;
  user_id: number;
  title: string;
  content: string | null;
  created_at: Date;
  updated_at: Date;
}

export function isIPost(data: unknown): data is IPost {
  return (
    data !== null &&
    typeof data === 'object' &&
    'post_id' in data &&
    'user_id' in data &&
    'title' in data &&
    'content' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.post_id === 'number' &&
    typeof data.user_id === 'number' &&
    typeof data.title === 'string' &&
    (data.content === null || typeof data.content === 'string') &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIPostArray(data: unknown): data is IPost[] {
  return Array.isArray(data) && data.every(isIPost);
}`;

    if (typeof tsInterfaces === 'string') {
      expect(normalizeWhitespace(tsInterfaces)).toStrictEqual(
        normalizeWhitespace(expectedOutput),
      );
    }
  });

  it('should generate correct TypeScript interfaces and type guards for POS', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: POSSchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });

    const expectedOutput = `
export interface IProduct {
  product_id: number;
  product_name: string;
}

export function isIProduct(data: unknown): data is IProduct {
  return (
    data !== null &&
    typeof data === 'object' &&
    'product_id' in data &&
    'product_name' in data &&
    typeof data.product_id === 'number' &&
    typeof data.product_name === 'string'
  );
}

export function isIProductArray(data: unknown): data is IProduct[] {
  return Array.isArray(data) && data.every(isIProduct);
}

export interface ICustomer {
  customer_id: number;
  name: string;
}

export function isICustomer(data: unknown): data is ICustomer {
  return (
    data !== null &&
    typeof data === 'object' &&
    'customer_id' in data &&
    'name' in data &&
    typeof data.customer_id === 'number' &&
    typeof data.name === 'string'
  );
}

export function isICustomerArray(data: unknown): data is ICustomer[] {
  return Array.isArray(data) && data.every(isICustomer);
}

export interface IOrder {
  order_id: number;
  customer_id: number;
}

export function isIOrder(data: unknown): data is IOrder {
  return (
    data !== null &&
    typeof data === 'object' &&
    'order_id' in data &&
    'customer_id' in data &&
    typeof data.order_id === 'number' &&
    typeof data.customer_id === 'number'
  );
}

export function isIOrderArray(data: unknown): data is IOrder[] {
  return Array.isArray(data) && data.every(isIOrder);
}

export interface IOrderProduct {
  order_product_id: number;
  order_id: number;
  product_id: number;
}

export function isIOrderProduct(data: unknown): data is IOrderProduct {
  return (
    data !== null &&
    typeof data === 'object' &&
    'order_product_id' in data &&
    'order_id' in data &&
    'product_id' in data &&
    typeof data.order_product_id === 'number' &&
    typeof data.order_id === 'number' &&
    typeof data.product_id === 'number'
  );
}

export function isIOrderProductArray(data: unknown): data is IOrderProduct[] {
  return Array.isArray(data) && data.every(isIOrderProduct);
}`;

    if (typeof tsInterfaces === 'string') {
      expect(normalizeWhitespace(tsInterfaces)).toStrictEqual(
        normalizeWhitespace(expectedOutput),
      );
    }
  });
});
