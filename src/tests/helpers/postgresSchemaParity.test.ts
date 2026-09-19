import { describe, expect, it } from 'vitest';
import { normalizePostgresCatalog, schemaParityDifferences } from './postgresSchemaParity.ts';

describe('postgres migration parity catalog semantics', () => {
  it('normalizes catalog ordering and generated names', () => {
    const schema = normalizePostgresCatalog({
      tables: [{ table_name: 'posts' }, { table_name: 'users' }],
      columns: [
        { table_name: 'posts', column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { table_name: 'users', column_name: 'id', udt_name: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
      ],
      primaryKeys: [{ table_name: 'users', constraint_name: 'posts_pkey', columns: ['id'] }],
      foreignKeys: [{ table_name: 'posts', constraint_name: 'posts_user_id_fkey', columns: ['user_id'], foreign_table_name: 'users', foreign_columns: ['id'] }],
      uniqueConstraints: [{ table_name: 'users', constraint_name: 'users_email_key', columns: ['email'] }],
      indexes: [{ table_name: 'users', index_name: 'users_email_idx', columns: ['email'], is_unique: true }],
    });
    expect(schema.tables.users.primaryKey).toEqual(['id']);
    expect(schema.tables.posts.foreignKeys[0]).toEqual({ columns: ['user_id'], table: 'users', referencedColumns: ['id'] });
  });

  it('reports useful semantic mismatch diagnostics', () => {
    const expected = normalizePostgresCatalog({ tables: [{ table_name: 'users' }], columns: [{ table_name: 'users', column_name: 'id', data_type: 'uuid', is_nullable: 'NO' }] });
    const actual = normalizePostgresCatalog({ tables: [{ table_name: 'users' }], columns: [{ table_name: 'users', column_name: 'id', data_type: 'text', is_nullable: 'NO' }] });
    expect(schemaParityDifferences(expected, actual)).toEqual(["table 'users' columns differ"]);
  });
});
