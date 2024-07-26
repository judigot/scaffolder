import identifyRelationships from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import JSON5 from 'json5';
import { ISchemaInfo } from '@/interfaces/interfaces';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import generateSQLSchema from '@/utils/generateSQLSchema';

describe('generateFile', () => {
  const schemaInput = JSON5.stringify({
    user: [
      {
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password:
          '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
      {
        user_id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        password:
          '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
    ],
    post: [
      {
        post_id: 1,
        user_id: 1,
        title: "John's Post",
        content: 'Lorem ipsum',
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
      {
        post_id: 2,
        user_id: 2,
        title: "Jane's Post",
        content: null,
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
    ],
  });

  const formData: Record<string, Record<string, unknown>[]> =
    JSON5.parse(schemaInput);
  const schemaInfo: ISchemaInfo[] = identifyRelationships(formData);

  it('should generate correct SQL schema', () => {
    const sqlSchema = generateSQLSchema(schemaInfo);
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "user" CASCADE;');
    expect(sqlSchema).toContain('CREATE TABLE "user" (');
    expect(sqlSchema).toContain('user_id BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('first_name TEXT NOT NULL');
    expect(sqlSchema).toContain('last_name TEXT NOT NULL');
    expect(sqlSchema).toContain('email TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('username TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('password CHAR(60) NOT NULL');
    expect(sqlSchema).toContain('created_at TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('updated_at TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "post" CASCADE;');
    expect(sqlSchema).toContain('CREATE TABLE "post" (');
    expect(sqlSchema).toContain('post_id BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('user_id BIGINT NOT NULL');
    expect(sqlSchema).toContain('title TEXT NOT NULL');
    expect(sqlSchema).toContain('content TEXT');
    expect(sqlSchema).toContain('created_at TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('updated_at TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain(
      'CONSTRAINT FK_post_user_id FOREIGN KEY (user_id) REFERENCES "user" (user_id)',
    );
  });

  it('should generate correct TypeScript interfaces', () => {
    const tsInterfaces = generateTypescriptInterfaces({
      schemaInfo,
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
});
