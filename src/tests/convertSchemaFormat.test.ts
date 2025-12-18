import { describe, it, expect } from 'vitest';
import { convertSchema } from '@/utils/convertSchemaFormat.ts';
import type { ISchemaInfo, ISchemaInfoSlim } from '@/interfaces/interfaces.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import masterSchemaSlim from '@/schema-infos/masterSchemaSlim.ts';

const isISchemaInfoArray = (
  value: ISchemaInfo[] | ISchemaInfoSlim,
): value is ISchemaInfo[] => {
  return Array.isArray(value) && value.length > 0 && 'columnsInfo' in value[0];
};

const isISchemaInfoSlim = (
  value: ISchemaInfo[] | ISchemaInfoSlim,
): value is ISchemaInfoSlim => {
  return Array.isArray(value) && value.length > 0 && 'columns' in value[0];
};

describe('convertSchemaFormat', () => {
  describe('convertSchema - full to compressed', () => {
    it('should convert a simple table with all column types', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'test',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
            {
              column_name: 'name',
              data_type: 'string',
              is_nullable: 'NO',
            },
            {
              column_name: 'description',
              data_type: 'string',
              is_nullable: 'YES',
            },
            {
              column_name: 'email',
              data_type: 'string',
              is_nullable: 'NO',
              unique: true,
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
          ],
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tableName: 'test',
        columns: [
          {
            name: 'id',
            type: 'number',
            default: 'AUTO_INCREMENT',
            primaryKey: true,
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'description',
            type: 'string',
            nullable: true,
          },
          {
            name: 'email',
            type: 'string',
            unique: true,
          },
          {
            name: 'user_id',
            type: 'number',
            foreign: 'user',
          },
        ],
      });
    });

    it('should convert table with isPivot flag', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'pivot_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              is_nullable: 'NO',
              primary_key: true,
            },
          ],
          isPivot: true,
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result[0].isPivot).toBe(true);
    });

    it('should convert table with viewQuery and viewStructure', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'view_table',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              is_nullable: 'NO',
            },
          ],
          viewQuery: 'SELECT * FROM base_table',
          viewStructure: ['id', 'name'],
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result[0].viewQuery).toBe('SELECT * FROM base_table');
      expect(result[0].viewStructure).toEqual(['id', 'name']);
    });

    it('should convert table with data (seed data)', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'test',
          columnsInfo: [
            {
              column_name: 'id',
              data_type: 'number',
              is_nullable: 'NO',
            },
          ],
          data: [
            { id: 1, name: 'Test 1' },
            { id: 2, name: 'Test 2' },
          ],
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result[0].data).toEqual([
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ]);
    });

    it('should omit nullable when column is not nullable', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'test',
          columnsInfo: [
            {
              column_name: 'required_field',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result[0].columns[0].nullable).toBeUndefined();
    });

    it('should omit default when it is null or undefined', () => {
      const fullSchema: ISchemaInfo[] = [
        {
          tableName: 'test',
          columnsInfo: [
            {
              column_name: 'no_default',
              data_type: 'string',
              is_nullable: 'NO',
              column_default: null,
            },
            {
              column_name: 'also_no_default',
              data_type: 'string',
              is_nullable: 'NO',
            },
          ],
        },
      ];

      const result = convertSchema({
        schema: fullSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result[0].columns[0].default).toBeUndefined();
      expect(result[0].columns[1].default).toBeUndefined();
    });

    it('should convert masterSchema correctly', () => {
      const result = convertSchema({
        schema: masterSchema,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(result)) {
        throw new Error('Expected compressed schema');
      }

      expect(result).toHaveLength(masterSchema.length);

      result.forEach((slimTable, index) => {
        const fullTable = masterSchema[index];
        expect(slimTable.tableName).toBe(fullTable.tableName);
        expect(slimTable.columns).toHaveLength(fullTable.columnsInfo.length);

        slimTable.columns.forEach((slimCol, colIndex) => {
          const fullCol = fullTable.columnsInfo[colIndex];
          expect(slimCol.name).toBe(fullCol.column_name);
          expect(slimCol.type).toBe(fullCol.data_type);

          if (fullCol.is_nullable === 'YES') {
            expect(slimCol.nullable).toBe(true);
          } else {
            expect(slimCol.nullable).toBeUndefined();
          }

          if (fullCol.primary_key === true) {
            expect(slimCol.primaryKey).toBe(true);
          } else {
            expect(slimCol.primaryKey).toBeUndefined();
          }

          if ('unique' in fullCol && fullCol.unique === true) {
            expect(slimCol.unique).toBe(true);
          } else {
            expect(slimCol.unique).toBeUndefined();
          }

          if ('foreign_key' in fullCol && fullCol.foreign_key !== undefined) {
            expect(slimCol.foreign).toBe(
              fullCol.foreign_key.foreign_table_name,
            );
          } else {
            expect(slimCol.foreign).toBeUndefined();
          }
        });

        if (fullTable.isPivot === true) {
          expect(slimTable.isPivot).toBe(true);
        }
      });
    });
  });

  describe('convertSchema - compressed to full', () => {
    it('should convert a simple table with all column types', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'test',
          columns: [
            {
              name: 'id',
              type: 'number',
              default: 'AUTO_INCREMENT',
              primaryKey: true,
            },
            {
              name: 'name',
              type: 'string',
            },
            {
              name: 'description',
              type: 'string',
              nullable: true,
            },
            {
              name: 'email',
              type: 'string',
              unique: true,
            },
            {
              name: 'user_id',
              type: 'number',
              foreign: 'user',
            },
          ],
        },
        {
          tableName: 'user',
          columns: [
            {
              name: 'user_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      expect(result).toHaveLength(2);

      const testTable = result.find((t) => t.tableName === 'test');
      if (!testTable) {
        throw new Error('testTable not found');
      }
      expect(testTable.columnsInfo).toHaveLength(5);

      expect(testTable.columnsInfo[0]).toEqual({
        column_name: 'id',
        data_type: 'number',
        is_nullable: 'NO',
        column_default: 'AUTO_INCREMENT',
        primary_key: true,
      });

      expect(testTable.columnsInfo[1]).toEqual({
        column_name: 'name',
        data_type: 'string',
        is_nullable: 'NO',
      });

      expect(testTable.columnsInfo[2]).toEqual({
        column_name: 'description',
        data_type: 'string',
        is_nullable: 'YES',
      });

      expect(testTable.columnsInfo[3]).toEqual({
        column_name: 'email',
        data_type: 'string',
        is_nullable: 'NO',
        unique: true,
      });

      expect(testTable.columnsInfo[4]).toEqual({
        column_name: 'user_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'user',
          foreign_column_name: 'user_id',
        },
      });

      expect(testTable.requiredColumns).toContain('id');
      expect(testTable.requiredColumns).toContain('name');
      expect(testTable.requiredColumns).toContain('email');
      expect(testTable.requiredColumns).toContain('user_id');
      expect(testTable.requiredColumns).not.toContain('description');

      expect(testTable.foreignKeys).toEqual(['user_id']);
      expect(testTable.foreignTables).toEqual(['user']);
      expect(testTable.belongsTo).toEqual(['user']);
    });

    it('should convert table with isPivot flag', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'pivot_table',
          isPivot: true,
          columns: [
            {
              name: 'id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      expect(result[0].isPivot).toBe(true);
    });

    it('should convert table with viewQuery and viewStructure', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'view_table',
          columns: [
            {
              name: 'id',
              type: 'number',
            },
          ],
          viewQuery: 'SELECT * FROM base_table',
          viewStructure: ['id', 'name'],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      expect(result[0].viewQuery).toBe('SELECT * FROM base_table');
      expect(result[0].viewStructure).toEqual(['id', 'name']);
    });

    it('should convert table with data (seed data)', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'test',
          columns: [
            {
              name: 'id',
              type: 'number',
            },
          ],
          data: [
            { id: 1, name: 'Test 1' },
            { id: 2, name: 'Test 2' },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      expect(result[0].data).toEqual([
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ]);
    });

    it('should infer foreign_column_name from foreign table primary key', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'order',
          columns: [
            {
              name: 'order_id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'customer_id',
              type: 'number',
              foreign: 'customer',
            },
          ],
        },
        {
          tableName: 'customer',
          columns: [
            {
              name: 'customer_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      const orderTable = result.find((t) => t.tableName === 'order');
      if (!orderTable) {
        throw new Error('orderTable not found');
      }
      expect(orderTable.columnsInfo[1].foreign_key).toEqual({
        foreign_table_name: 'customer',
        foreign_column_name: 'customer_id',
      });
    });

    it('should infer childTables from foreign keys', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'parent',
          columns: [
            {
              name: 'parent_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
        {
          tableName: 'child',
          columns: [
            {
              name: 'child_id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'parent_id',
              type: 'number',
              foreign: 'parent',
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      const parentTable = result.find((t) => t.tableName === 'parent');
      if (!parentTable) {
        throw new Error('parentTable not found');
      }
      expect(parentTable.childTables).toEqual(['child']);
    });

    it('should infer hasOne relationship from unique foreign key', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'user',
          columns: [
            {
              name: 'user_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
        {
          tableName: 'profile',
          columns: [
            {
              name: 'profile_id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'user_id',
              type: 'number',
              unique: true,
              foreign: 'user',
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      const userTable = result.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('userTable not found');
      }
      expect(userTable.hasOne).toEqual(['profile']);
      expect(userTable.hasMany).toBeUndefined();
    });

    it('should infer hasMany relationship from non-unique foreign key', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'user',
          columns: [
            {
              name: 'user_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
        {
          tableName: 'post',
          columns: [
            {
              name: 'post_id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'user_id',
              type: 'number',
              foreign: 'user',
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      const userTable = result.find((t) => t.tableName === 'user');
      if (!userTable) {
        throw new Error('userTable not found');
      }
      expect(userTable.hasMany).toEqual(['post']);
      expect(userTable.hasOne).toBeUndefined();
    });

    it('should infer belongsToMany and pivotRelationships from pivot tables', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'product',
          columns: [
            {
              name: 'product_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
        {
          tableName: 'order',
          columns: [
            {
              name: 'order_id',
              type: 'number',
              primaryKey: true,
            },
          ],
        },
        {
          tableName: 'order_product',
          isPivot: true,
          columns: [
            {
              name: 'order_product_id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'order_id',
              type: 'number',
              foreign: 'order',
            },
            {
              name: 'product_id',
              type: 'number',
              foreign: 'product',
            },
          ],
        },
      ];

      const result = convertSchema({ schema: slimSchema, target: 'full' });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      const productTable = result.find((t) => t.tableName === 'product');
      if (!productTable) {
        throw new Error('productTable not found');
      }
      expect(productTable.belongsToMany).toEqual(['order']);
      expect(productTable.pivotRelationships).toEqual([
        {
          relatedTable: 'order',
          pivotTable: 'order_product',
        },
      ]);

      const orderTable = result.find((t) => t.tableName === 'order');
      if (!orderTable) {
        throw new Error('orderTable not found');
      }
      expect(orderTable.belongsToMany).toEqual(['product']);
      expect(orderTable.pivotRelationships).toEqual([
        {
          relatedTable: 'product',
          pivotTable: 'order_product',
        },
      ]);
    });

    it('should throw error when foreign table is not found', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'test',
          columns: [
            {
              name: 'id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'missing_foreign_id',
              type: 'number',
              foreign: 'nonexistent_table',
            },
          ],
        },
      ];

      expect(() => {
        convertSchema({ schema: slimSchema, target: 'full' });
      }).toThrow(
        'Foreign table "nonexistent_table" not found in schema for column "missing_foreign_id" in table "test"',
      );
    });

    it('should throw error when foreign table has no primary key', () => {
      const slimSchema: ISchemaInfoSlim = [
        {
          tableName: 'test',
          columns: [
            {
              name: 'id',
              type: 'number',
              primaryKey: true,
            },
            {
              name: 'foreign_id',
              type: 'number',
              foreign: 'no_pk_table',
            },
          ],
        },
        {
          tableName: 'no_pk_table',
          columns: [
            {
              name: 'id',
              type: 'number',
            },
          ],
        },
      ];

      expect(() => {
        convertSchema({ schema: slimSchema, target: 'full' });
      }).toThrow(
        'Primary key not found in foreign table "no_pk_table" referenced by column "foreign_id" in table "test"',
      );
    });

    it('should convert masterSchemaSlim correctly', () => {
      const result = convertSchema({
        schema: masterSchemaSlim,
        target: 'full',
      });
      if (!isISchemaInfoArray(result)) {
        throw new Error('Expected full schema');
      }

      expect(result).toHaveLength(masterSchemaSlim.length);

      result.forEach((fullTable, index) => {
        const slimTable = masterSchemaSlim[index];
        expect(fullTable.tableName).toBe(slimTable.tableName);
        expect(fullTable.columnsInfo).toHaveLength(slimTable.columns.length);

        fullTable.columnsInfo.forEach((fullCol, colIndex) => {
          const slimCol = slimTable.columns[colIndex];
          expect(fullCol.column_name).toBe(slimCol.name);
          expect(fullCol.data_type).toBe(slimCol.type);

          const slimColNullable =
            'nullable' in slimCol ? slimCol.nullable : undefined;
          if (slimColNullable === true) {
            expect(fullCol.is_nullable).toBe('YES');
          } else {
            expect(fullCol.is_nullable).toBe('NO');
          }

          const slimColPrimaryKey =
            'primaryKey' in slimCol ? slimCol.primaryKey : undefined;
          if (slimColPrimaryKey === true) {
            expect(fullCol.primary_key).toBe(true);
          } else {
            expect(fullCol.primary_key).toBeUndefined();
          }

          const slimColUnique =
            'unique' in slimCol ? slimCol.unique : undefined;
          if (slimColUnique === true) {
            expect(fullCol.unique).toBe(true);
          } else {
            expect(fullCol.unique).toBeUndefined();
          }

          const slimColForeign =
            'foreign' in slimCol ? slimCol.foreign : undefined;
          if (slimColForeign !== undefined) {
            expect(fullCol.foreign_key).toBeDefined();
            if (!fullCol.foreign_key) {
              throw new Error('foreign_key should be defined');
            }
            expect(fullCol.foreign_key.foreign_table_name).toBe(slimColForeign);
          } else {
            expect(fullCol.foreign_key).toBeUndefined();
          }
        });

        if (slimTable.isPivot === true) {
          expect(fullTable.isPivot).toBe(true);
        }
      });
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity when converting full -> compressed -> full', () => {
      const original = masterSchema;
      const compressed = convertSchema({
        schema: original,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(compressed)) {
        throw new Error('Expected compressed schema');
      }
      const backToFull = convertSchema({ schema: compressed, target: 'full' });
      if (!isISchemaInfoArray(backToFull)) {
        throw new Error('Expected full schema');
      }

      expect(backToFull).toHaveLength(original.length);

      backToFull.forEach((convertedTable, index) => {
        const originalTable = original[index];

        expect(convertedTable.tableName).toBe(originalTable.tableName);
        expect(convertedTable.columnsInfo).toHaveLength(
          originalTable.columnsInfo.length,
        );

        convertedTable.columnsInfo.forEach((convertedCol, colIndex) => {
          const originalCol = originalTable.columnsInfo[colIndex];

          expect(convertedCol.column_name).toBe(originalCol.column_name);
          expect(convertedCol.data_type).toBe(originalCol.data_type);
          expect(convertedCol.is_nullable).toBe(originalCol.is_nullable);

          if (originalCol.column_default !== undefined) {
            expect(convertedCol.column_default).toBe(
              originalCol.column_default,
            );
          }

          if (originalCol.primary_key === true) {
            expect(convertedCol.primary_key).toBe(true);
          }

          const originalColUnique =
            'unique' in originalCol ? originalCol.unique : undefined;
          if (originalColUnique === true) {
            expect(convertedCol.unique).toBe(true);
          }

          const originalColForeignKey =
            'foreign_key' in originalCol ? originalCol.foreign_key : undefined;
          if (originalColForeignKey !== undefined) {
            expect(convertedCol.foreign_key).toBeDefined();
            if (!convertedCol.foreign_key) {
              throw new Error('foreign_key should be defined');
            }
            expect(convertedCol.foreign_key.foreign_table_name).toBe(
              originalColForeignKey.foreign_table_name,
            );
            expect(convertedCol.foreign_key.foreign_column_name).toBe(
              originalColForeignKey.foreign_column_name,
            );
          }
        });

        if (originalTable.isPivot === true) {
          expect(convertedTable.isPivot).toBe(true);
        }

        const originalTableViewQuery =
          'viewQuery' in originalTable ? originalTable.viewQuery : undefined;
        if (originalTableViewQuery !== undefined) {
          expect(convertedTable.viewQuery).toBe(originalTableViewQuery);
        }

        const originalTableViewStructure =
          'viewStructure' in originalTable
            ? originalTable.viewStructure
            : undefined;
        if (originalTableViewStructure !== undefined) {
          expect(convertedTable.viewStructure).toEqual(
            originalTableViewStructure,
          );
        }

        const originalTableData =
          'data' in originalTable ? originalTable.data : undefined;
        if (originalTableData !== undefined) {
          expect(convertedTable.data).toEqual(originalTableData);
        }
      });
    });

    it('should maintain data integrity when converting compressed -> full -> compressed', () => {
      const original = masterSchemaSlim;
      const full = convertSchema({ schema: original, target: 'full' });
      if (!isISchemaInfoArray(full)) {
        throw new Error('Expected full schema');
      }
      const backToCompressed = convertSchema({
        schema: full,
        target: 'compressed',
      });
      if (!isISchemaInfoSlim(backToCompressed)) {
        throw new Error('Expected compressed schema');
      }

      expect(backToCompressed).toHaveLength(original.length);

      backToCompressed.forEach((convertedTable, index) => {
        const originalTable = original[index];

        expect(convertedTable.tableName).toBe(originalTable.tableName);
        expect(convertedTable.columns).toHaveLength(
          originalTable.columns.length,
        );

        convertedTable.columns.forEach((convertedCol, colIndex) => {
          const originalCol = originalTable.columns[colIndex];

          expect(convertedCol.name).toBe(originalCol.name);
          expect(convertedCol.type).toBe(originalCol.type);

          const originalColNullable =
            'nullable' in originalCol ? originalCol.nullable : undefined;
          if (originalColNullable === true) {
            expect(convertedCol.nullable).toBe(true);
          } else {
            expect(convertedCol.nullable).toBeUndefined();
          }

          const originalColDefault =
            'default' in originalCol ? originalCol.default : undefined;
          if (originalColDefault !== undefined) {
            expect(convertedCol.default).toBe(originalColDefault);
          } else {
            expect(convertedCol.default).toBeUndefined();
          }

          const originalColPrimaryKey =
            'primaryKey' in originalCol ? originalCol.primaryKey : undefined;
          if (originalColPrimaryKey === true) {
            expect(convertedCol.primaryKey).toBe(true);
          } else {
            expect(convertedCol.primaryKey).toBeUndefined();
          }

          const originalColUnique =
            'unique' in originalCol ? originalCol.unique : undefined;
          if (originalColUnique === true) {
            expect(convertedCol.unique).toBe(true);
          } else {
            expect(convertedCol.unique).toBeUndefined();
          }

          const originalColForeign =
            'foreign' in originalCol ? originalCol.foreign : undefined;
          if (originalColForeign !== undefined) {
            expect(convertedCol.foreign).toBe(originalColForeign);
          } else {
            expect(convertedCol.foreign).toBeUndefined();
          }
        });

        if (originalTable.isPivot === true) {
          expect(convertedTable.isPivot).toBe(true);
        }

        const originalTableViewQuery =
          'viewQuery' in originalTable ? originalTable.viewQuery : undefined;
        if (originalTableViewQuery !== undefined) {
          expect(convertedTable.viewQuery).toBe(originalTableViewQuery);
        }

        const originalTableViewStructure =
          'viewStructure' in originalTable
            ? originalTable.viewStructure
            : undefined;
        if (originalTableViewStructure !== undefined) {
          expect(convertedTable.viewStructure).toEqual(
            originalTableViewStructure,
          );
        }

        const originalTableData =
          'data' in originalTable ? originalTable.data : undefined;
        if (originalTableData !== undefined) {
          expect(convertedTable.data).toEqual(originalTableData);
        }
      });
    });
  });
});
