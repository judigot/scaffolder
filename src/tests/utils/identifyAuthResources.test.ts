import { describe, it, expect } from 'vitest';
import {
  identifyAuthResources,
  findUserTable,
} from '@/utils/identifyAuthResources.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('identifyAuthResources', () => {
  describe('findUserTable', () => {
    it('should find table named "user"', () => {
      const schema: ISchemaInfo[] = [
        { tableName: 'user', columnsInfo: [] },
        { tableName: 'post', columnsInfo: [] },
      ];
      const result = findUserTable(schema);
      expect(result?.tableName).toBe('user');
    });

    it('should find table named "users"', () => {
      const schema: ISchemaInfo[] = [
        { tableName: 'users', columnsInfo: [] },
        { tableName: 'posts', columnsInfo: [] },
      ];
      const result = findUserTable(schema);
      expect(result?.tableName).toBe('users');
    });

    it('should find table named "account"', () => {
      const schema: ISchemaInfo[] = [
        { tableName: 'account', columnsInfo: [] },
        { tableName: 'post', columnsInfo: [] },
      ];
      const result = findUserTable(schema);
      expect(result?.tableName).toBe('account');
    });

    it('should return undefined when no user table exists', () => {
      const schema: ISchemaInfo[] = [
        { tableName: 'product', columnsInfo: [] },
        { tableName: 'order', columnsInfo: [] },
      ];
      const result = findUserTable(schema);
      expect(result).toBeUndefined();
    });
  });

  describe('identifyAuthResources', () => {
    it('should mark direct children of user as auth resources', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['post'],
        },
        {
          tableName: 'post',
          columnsInfo: [
            { column_name: 'post_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id' },
            },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[0].isAuthResource).toBeUndefined(); // user table itself is NOT an auth resource
      expect(result[1].isAuthResource).toBe(true);
      expect(result[1].ownerField).toBe('user_id');
    });

    it('should mark grandchildren as auth resources', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['post'],
        },
        {
          tableName: 'post',
          columnsInfo: [
            { column_name: 'post_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id' },
            },
          ],
          childTables: ['comment'],
        },
        {
          tableName: 'comment',
          columnsInfo: [
            { column_name: 'comment_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'post_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'post', foreign_column_name: 'post_id' },
            },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[0].isAuthResource).toBeUndefined(); // user
      expect(result[1].isAuthResource).toBe(true); // post
      expect(result[2].isAuthResource).toBe(true); // comment (grandchild)
    });

    it('should NOT mark pivot tables as auth resources', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['user_role'],
        },
        {
          tableName: 'role',
          columnsInfo: [
            { column_name: 'role_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['user_role'],
        },
        {
          tableName: 'user_role',
          columnsInfo: [
            { column_name: 'user_role_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id' },
            },
            {
              column_name: 'role_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'role', foreign_column_name: 'role_id' },
            },
          ],
          isPivot: true,
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[0].isAuthResource).toBeUndefined(); // user
      expect(result[1].isAuthResource).toBeUndefined(); // role
      expect(result[2].isAuthResource).toBeUndefined(); // user_role (pivot)
    });

    it('should NOT mark unrelated tables (product, customer) as auth resources', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['post'],
        },
        {
          tableName: 'post',
          columnsInfo: [
            { column_name: 'post_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id' },
            },
          ],
        },
        {
          tableName: 'product',
          columnsInfo: [
            { column_name: 'product_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
        },
        {
          tableName: 'customer',
          columnsInfo: [
            { column_name: 'customer_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[0].isAuthResource).toBeUndefined(); // user
      expect(result[1].isAuthResource).toBe(true); // post
      expect(result[2].isAuthResource).toBeUndefined(); // product
      expect(result[3].isAuthResource).toBeUndefined(); // customer
    });

    it('should return unchanged schema when no user table exists', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'product',
          columnsInfo: [
            { column_name: 'product_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
        },
        {
          tableName: 'order',
          columnsInfo: [
            { column_name: 'order_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result).toStrictEqual(schema);
      expect(result[0].isAuthResource).toBeUndefined();
      expect(result[1].isAuthResource).toBeUndefined();
    });

    it('should detect ownerField from foreign key to user', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['profile'],
        },
        {
          tableName: 'profile',
          columnsInfo: [
            { column_name: 'profile_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id' },
            },
            { column_name: 'bio', data_type: 'string', is_nullable: 'YES' },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[1].isAuthResource).toBe(true);
      expect(result[1].ownerField).toBe('user_id');
    });

    it('should detect ownerField using common patterns when no direct FK', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
          ],
          childTables: ['settings'],
        },
        {
          tableName: 'settings',
          columnsInfo: [
            { column_name: 'settings_id', data_type: 'number', is_nullable: 'NO', primary_key: true },
            { column_name: 'owner_id', data_type: 'number', is_nullable: 'NO' }, // No FK defined
            { column_name: 'theme', data_type: 'string', is_nullable: 'NO' },
          ],
        },
      ];

      const result = identifyAuthResources(schema);

      expect(result[1].isAuthResource).toBe(true);
      expect(result[1].ownerField).toBe('owner_id');
    });
  });
});
