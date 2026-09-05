import { describe, it, expect } from 'vitest';
import {
  validateSchemaInfo,
  assertValidSchemaInfo,
} from '@/utils/validateSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('validateSchemaInfo', () => {
  const validSchema: ISchemaInfo[] = [
    {
      tableName: 'user',
      columnsInfo: [
        {
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          primary_key: true,
        },
        { column_name: 'email', data_type: 'string', is_nullable: 'NO' },
      ],
      childTables: ['post'],
      hasMany: ['post'],
    },
    {
      tableName: 'post',
      columnsInfo: [
        {
          column_name: 'post_id',
          data_type: 'number',
          is_nullable: 'NO',
          primary_key: true,
        },
        {
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        },
        { column_name: 'title', data_type: 'string', is_nullable: 'NO' },
      ],
      foreignTables: ['user'],
      foreignKeys: ['user_id'],
      belongsTo: ['user'],
      isAuthResource: true,
      ownerField: 'user_id',
    },
  ];

  it('should return no errors for valid schema', () => {
    const errors = validateSchemaInfo(validSchema);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid foreignTables reference', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
        ],
        foreignTables: ['nonexistent_table'],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('foreignTables');
    expect(errors[0].value).toBe('nonexistent_table');
    expect(errors[0].message).toContain('does not exist');
  });

  it('should detect invalid ownerField reference', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
        ],
        isAuthResource: true,
        ownerField: 'nonexistent_column',
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('ownerField');
    expect(errors[0].value).toBe('nonexistent_column');
    expect(errors[0].message).toContain('does not exist');
  });

  it('should detect invalid belongsTo reference', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
        ],
        belongsTo: ['nonexistent_table'],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('belongsTo');
  });

  it('should detect invalid foreign_key.foreign_table_name', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
          {
            column_name: 'user_id',
            data_type: 'number',
            is_nullable: 'NO',
            foreign_key: {
              foreign_table_name: 'nonexistent_table',
              foreign_column_name: 'id',
            },
          },
        ],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('nonexistent_table');
  });

  it('should detect invalid foreign_key.foreign_column_name', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'user',
        columnsInfo: [
          { column_name: 'user_id', data_type: 'number', is_nullable: 'NO' },
        ],
      },
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
          {
            column_name: 'user_id',
            data_type: 'number',
            is_nullable: 'NO',
            foreign_key: {
              foreign_table_name: 'user',
              foreign_column_name: 'nonexistent_column',
            },
          },
        ],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('nonexistent_column');
  });

  it('should detect invalid pivotRelationships references', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'user',
        columnsInfo: [
          { column_name: 'user_id', data_type: 'number', is_nullable: 'NO' },
        ],
        pivotRelationships: [
          { relatedTable: 'nonexistent_table', pivotTable: 'user_role' },
        ],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('pivotRelationships.relatedTable');
  });

  it('should detect invalid foreignKeys reference', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
        ],
        foreignKeys: ['nonexistent_column'],
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('foreignKeys');
  });

  it('should detect multiple errors', () => {
    const invalidSchema: ISchemaInfo[] = [
      {
        tableName: 'post',
        columnsInfo: [
          { column_name: 'post_id', data_type: 'number', is_nullable: 'NO' },
        ],
        foreignTables: ['bad_table1'],
        belongsTo: ['bad_table2'],
        ownerField: 'bad_column',
      },
    ];

    const errors = validateSchemaInfo(invalidSchema);
    expect(errors.length).toBe(3);
  });

  describe('assertValidSchemaInfo', () => {
    it('should not throw for valid schema', () => {
      expect(() => {
        assertValidSchemaInfo(validSchema);
      }).not.toThrow();
    });

    it('should throw for invalid schema', () => {
      const invalidSchema: ISchemaInfo[] = [
        {
          tableName: 'post',
          columnsInfo: [],
          foreignTables: ['nonexistent'],
        },
      ];

      expect(() => {
        assertValidSchemaInfo(invalidSchema);
      }).toThrow('Schema validation failed');
    });
  });
});
