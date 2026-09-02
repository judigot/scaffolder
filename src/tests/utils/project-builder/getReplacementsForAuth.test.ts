import { describe, expect, it } from 'vitest';
import { getReplacementsForAuth } from '@/utils/project-builder/template-processors/getReplacementsForAuth.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

const uuidAuthSchemaWithoutOptionalNameColumns: ISchemaInfo[] = [
  {
    tableName: 'user',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        primary_key: true,
      },
      {
        column_name: 'email',
        data_type: 'string',
        is_nullable: 'NO',
        unique: true,
      },
      {
        column_name: 'hashed_password',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'createdAt',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    hasMany: ['session'],
  },
  {
    tableName: 'session',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'string',
        is_nullable: 'NO',
        primary_key: true,
      },
      {
        column_name: 'userId',
        data_type: 'uuid',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'user',
          foreign_column_name: 'id',
        },
      },
      {
        column_name: 'expiresAt',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    belongsTo: ['user'],
  },
];

describe('getReplacementsForAuth uuid kitchen-sink schema', () => {
  it('uses email and hashed_password when username and name columns are absent', () => {
    const replacements = getReplacementsForAuth(
      uuidAuthSchemaWithoutOptionalNameColumns,
    );

    expect(replacements.hasUsernameColumn).toBe('false');
    expect(replacements.hasFirstNameColumn).toBe('false');
    expect(replacements.hasLastNameColumn).toBe('false');
    expect(replacements.userUsernameColumnCamelCase).toBeUndefined();
    expect(replacements.userEmailColumnCamelCase).toBe('email');
    expect(replacements.userPasswordColumnCamelCase).toBe('hashedPassword');
    expect(replacements.userPrimaryKeyDataType).toBe('uuid');
  });

  it('preserves camelCase session.userId as the Lucia user foreign key', () => {
    const replacements = getReplacementsForAuth(
      uuidAuthSchemaWithoutOptionalNameColumns,
    );

    expect(replacements.sessionUserColumnCamelCase).toBe('userId');
    expect(replacements.sessionExpiresColumnCamelCase).toBe('expiresAt');
  });
});
