import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';

describe('generateTypescriptInterfaces', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct TypeScript interfaces for one-to-one relationship', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: userPostOneToOneSchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });
    expect(tsInterfaces).toContain('export interface IUser {');
    expect(tsInterfaces).toContain('user_id: number;');
    expect(tsInterfaces).toContain('first_name: string;');
    expect(tsInterfaces).toContain('last_name: string;');
    expect(tsInterfaces).toContain('email: string;');
    expect(tsInterfaces).toContain('username: string;');
    expect(tsInterfaces).toContain('password: string;');
    expect(tsInterfaces).toContain('created_at: Date;');
    expect(tsInterfaces).toContain('updated_at: Date;');
    expect(tsInterfaces).toContain('export interface IPost {');
    expect(tsInterfaces).toContain('post_id: number;');
    expect(tsInterfaces).toContain('user_id: number;');
    expect(tsInterfaces).toContain('title: string;');
    expect(tsInterfaces).toContain('content: string | null;');
    expect(tsInterfaces).toContain('created_at: Date;');
    expect(tsInterfaces).toContain('updated_at: Date;');
  });

  it('should generate correct TypeScript interfaces for one-to-many relationship', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: userPostsOneToManySchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });
    expect(tsInterfaces).toContain('export interface IUser {');
    expect(tsInterfaces).toContain('user_id: number;');
    expect(tsInterfaces).toContain('first_name: string;');
    expect(tsInterfaces).toContain('last_name: string;');
    expect(tsInterfaces).toContain('email: string;');
    expect(tsInterfaces).toContain('username: string;');
    expect(tsInterfaces).toContain('password: string;');
    expect(tsInterfaces).toContain('created_at: Date;');
    expect(tsInterfaces).toContain('updated_at: Date;');
    expect(tsInterfaces).toContain('export interface IPost {');
    expect(tsInterfaces).toContain('post_id: number;');
    expect(tsInterfaces).toContain('user_id: number;');
    expect(tsInterfaces).toContain('title: string;');
    expect(tsInterfaces).toContain('content: string | null;');
    expect(tsInterfaces).toContain('created_at: Date;');
    expect(tsInterfaces).toContain('updated_at: Date;');
  });

  it('should generate correct TypeScript interfaces for POS', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo: POSSchemaInfo,
      includeTypeGuards: true,
      outputOnSingleFile: true,
    });
    expect(tsInterfaces).toContain('export interface IProduct {');
    expect(tsInterfaces).toContain('product_id: number;');
    expect(tsInterfaces).toContain('product_name: string;');
    expect(tsInterfaces).toContain('export interface ICustomer {');
    expect(tsInterfaces).toContain('customer_id: number;');
    expect(tsInterfaces).toContain('name: string;');
    expect(tsInterfaces).toContain('export interface IOrder {');
    expect(tsInterfaces).toContain('order_id: number;');
    expect(tsInterfaces).toContain('customer_id: number;');
    expect(tsInterfaces).toContain('export interface IOrderProduct {');
    expect(tsInterfaces).toContain('order_product_id: number;');
    expect(tsInterfaces).toContain('order_id: number;');
    expect(tsInterfaces).toContain('product_id: number;');
  });
});
