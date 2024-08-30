import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import generateSQLSchema from '@/utils/generateSQLSchema';
import { format as formatSQL } from 'sql-formatter';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { APP_SETTINGS } from '@/constants';

describe('generateFile', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);

  it('should generate correct SQL schema for one-to-one relationship with ON DELETE CASCADE', () => {
    const deleteTablesQueries = generateSQLDeleteTables(
      userPostOneToOneSchemaInfo,
    );
    const sqlSchema = `${String(deleteTablesQueries.join('\n'))}\n\n${formatSQL(generateSQLSchema(userPostOneToOneSchemaInfo))}`;
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "user";');
    expect(sqlSchema).toContain('CREATE TABLE "user" (');
    expect(sqlSchema).toContain('"user_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"first_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"last_name" TEXT NOT NULL');
    expect(sqlSchema).toContain('"email" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"username" TEXT UNIQUE NOT NULL');
    expect(sqlSchema).toContain('"password" CHAR(60) NOT NULL');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('DROP TABLE IF EXISTS "post";');
    expect(sqlSchema).toContain('CREATE TABLE "post" (');
    expect(sqlSchema).toContain('"post_id" BIGSERIAL PRIMARY KEY');
    expect(sqlSchema).toContain('"user_id" BIGINT NOT NULL UNIQUE'); // Enforce one-to-one with UNIQUE constraint
    expect(sqlSchema).toContain('"title" TEXT NOT NULL');
    expect(sqlSchema).toContain('"content" TEXT');
    expect(sqlSchema).toContain('"created_at" TIMESTAMPTZ (6) NOT NULL');
    expect(sqlSchema).toContain('"updated_at" TIMESTAMPTZ (6) NOT NULL');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.onDeleteCascade) {
      expect(sqlSchema).toContain(
        'CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id") ON DELETE CASCADE',
      );
    } else {
      expect(sqlSchema).toContain(
        'CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("user_id")',
      );
    }
  });

  it('should generate correct TypeScript interfaces', () => {
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
    expect(tsInterfaces).toContain('user_id: number;'); // Matches the one-to-one relationship
    expect(tsInterfaces).toContain('title: string;');
    expect(tsInterfaces).toContain('content: string | null;');
    expect(tsInterfaces).toContain('created_at: Date;');
    expect(tsInterfaces).toContain('updated_at: Date;');
  });
});
