import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTypeMapping } from '@/utils/common.ts';
import type { IColumnInfo } from '@/interfaces/interfaces.ts';
import {
  setupTypeMappings,
  teardownTypeMappings,
} from '@/tests/helpers/setupTypeMappings.ts';

describe('getTypeMapping uuid and auth columns', () => {
  beforeEach(() => {
    setupTypeMappings();
  });

  afterEach(() => {
    teardownTypeMappings();
  });

  it('maps uuid primary keys to real uuid types instead of empty strings', () => {
    const column: IColumnInfo = {
      column_name: 'id',
      data_type: 'uuid',
      is_nullable: 'NO',
      primary_key: true,
    };

    expect(getTypeMapping(column, 'postgresql')).toBe('UUID');
    expect(getTypeMapping(column, 'typescript')).toBe('string');
  });

  it('maps camelCase uuid foreign keys without smashing the identifier', () => {
    const column: IColumnInfo = {
      column_name: 'userId',
      data_type: 'uuid',
      is_nullable: 'NO',
      foreign_key: {
        foreign_table_name: 'user',
        foreign_column_name: 'id',
      },
    };

    expect(getTypeMapping(column, 'postgresql')).toBe('UUID');
    expect(getTypeMapping(column, 'typescript')).toBe('string');
  });

  it('maps hashed_password to the password column type', () => {
    const column: IColumnInfo = {
      column_name: 'hashed_password',
      data_type: 'string',
      is_nullable: 'NO',
    };

    expect(getTypeMapping(column, 'postgresql')).toBe('CHAR(60)');
    expect(getTypeMapping(column, 'typescript')).toBe('string');
  });
});
