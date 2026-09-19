import { describe, expect, it } from 'vitest';
import { createApplicationContract } from '@/contracts/applicationContract.ts';

describe('ApplicationContract', () => {
  it('normalizes existing schemaInfo without framework-specific metadata', () => {
    const contract = createApplicationContract([
      {
        tableName: 'users',
        columnsInfo: [
          {
            column_name: 'id',
            data_type: 'number',
            is_nullable: 'NO',
            primary_key: true,
          },
        ],
        hasMany: ['orders'],
      },
    ]);

    expect(contract).toEqual({
      version: 1,
      database: 'postgresql',
      entities: [
        expect.objectContaining({
          name: 'users',
          relationships: {
            hasOne: [],
            hasMany: ['orders'],
            belongsTo: [],
            belongsToMany: [],
          },
        }),
      ],
      operations: ['list', 'get', 'create', 'update', 'delete'],
    });
  });
});

