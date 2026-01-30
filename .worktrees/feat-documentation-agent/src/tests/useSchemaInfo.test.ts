import { describe, it, expect } from 'vitest';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import masterSchemaWithId from '@/schema-infos/masterSchemaWithId.ts';
import { hiddenFields } from '@/frameworks/backend/laravel/createModels.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('useSchemaInfo', () => {
  const schemaInfo = getSchemaInfo(masterSchema);

  it('should return all table names', () => {
    expect(schemaInfo.tableNames).toEqual([
      'product',
      'customer',
      'order',
      'order_product',
      'user',
      'profile',
      'posts',
    ]);
  });

  it('should identify pivot tables', () => {
    expect(schemaInfo.pivotTables).toEqual(['order_product']);
  });

  describe('Primary Keys', () => {
    it('should return primary key for many-to-many tables', () => {
      expect(schemaInfo.getPrimaryKey('product')).toBe('product_id');
      expect(schemaInfo.getPrimaryKey('order')).toBe('order_id');
      expect(schemaInfo.getPrimaryKey('order_product')).toBe(
        'order_product_id',
      );
    });

    it('should return primary key for one-to-one tables', () => {
      expect(schemaInfo.getPrimaryKey('user')).toBe('user_id');
      expect(schemaInfo.getPrimaryKey('profile')).toBe('profile_id');
    });

    it('should return primary key for one-to-many tables', () => {
      expect(schemaInfo.getPrimaryKey('posts')).toBe('post_id');
    });

    it('should support primary keys named "id" (not tableName_id)', () => {
      const schemaInfoWithId = getSchemaInfo(masterSchemaWithId);
      expect(schemaInfoWithId.getPrimaryKey('product')).toBe('id');
      expect(schemaInfoWithId.getPrimaryKey('customer')).toBe('id');
      expect(schemaInfoWithId.getPrimaryKey('order')).toBe('id');
      expect(schemaInfoWithId.getPrimaryKey('user')).toBe('id');
    });
  });

  describe('Relationships', () => {
    it('should handle many-to-many relationships', () => {
      const productRelationships = schemaInfo.getRelationships('product');
      expect(productRelationships.hasMany).toEqual(['order_product']);
      expect(productRelationships.belongsToMany).toEqual(['order']);
      expect(productRelationships.pivotRelationships).toEqual([
        {
          relatedTable: 'order',
          pivotTable: 'order_product',
        },
      ]);

      const orderRelationships = schemaInfo.getRelationships('order');
      expect(orderRelationships.belongsTo).toEqual(['customer']);
      expect(orderRelationships.belongsToMany).toEqual(['product']);
    });

    it('should handle one-to-one relationships', () => {
      const userRelationships = schemaInfo.getRelationships('user');
      expect(userRelationships.hasOne).toEqual(['profile']);

      const profileRelationships = schemaInfo.getRelationships('profile');
      expect(profileRelationships.belongsTo).toEqual(['user']);
    });

    it('should handle one-to-many relationships', () => {
      const userRelationships = schemaInfo.getRelationships('user');
      expect(userRelationships.hasMany).toContain('posts');

      const postsRelationships = schemaInfo.getRelationships('posts');
      expect(postsRelationships.belongsTo).toEqual(['user']);
    });
  });

  describe('Foreign Keys', () => {
    it('should handle unique foreign keys (one-to-one)', () => {
      const profileColumns = schemaInfo.getColumnsInfo('profile');
      const userIdColumn = profileColumns.find(
        (col) => col.column_name === 'user_id',
      );
      expect(userIdColumn?.unique).toBe(true);
    });

    it('should handle non-unique foreign keys (one-to-many)', () => {
      const postsColumns = schemaInfo.getColumnsInfo('posts');
      const userIdColumn = postsColumns.find(
        (col) => col.column_name === 'user_id',
      );
      expect(userIdColumn?.unique).toBeUndefined();
    });

    it('should return foreign tables', () => {
      expect(schemaInfo.getForeignTables('order')).toEqual(['customer']);
      expect(schemaInfo.getForeignTables('order_product')).toEqual([
        'order',
        'product',
      ]);
      expect(schemaInfo.getForeignTables('posts')).toEqual(['user']);
    });
  });

  describe('Required Columns', () => {
    it('should return required columns for user table', () => {
      const userRequired = schemaInfo.getRequiredColumns('user');
      [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'username',
        'password',
      ].forEach((col) => {
        expect(userRequired).toContain(col);
      });
    });

    it('should return required columns for pivot table', () => {
      const orderProductRequired =
        schemaInfo.getRequiredColumns('order_product');
      expect(orderProductRequired).toEqual([
        'order_product_id',
        'order_id',
        'product_id',
      ]);
    });

    it('should handle nullable columns', () => {
      const postsColumns = schemaInfo.getColumnsInfo('posts');
      const contentColumn = postsColumns.find(
        (col) => col.column_name === 'content',
      );
      expect(contentColumn?.is_nullable).toBe('YES');
    });
  });

  describe('Get All Columns', () => {
    it('should return all columns for user table', () => {
      const userColumns = schemaInfo.getAllColumns('user');
      expect(userColumns).toEqual([
        'user_id',
        'first_name',
        'last_name',
        'email',
        'username',
        'password',
        'created_at',
        'updated_at',
      ]);
    });

    it('should return all columns for pivot table', () => {
      const orderProductColumns = schemaInfo.getAllColumns('order_product');
      expect(orderProductColumns).toEqual([
        'order_product_id',
        'order_id',
        'product_id',
      ]);
    });
  });

  describe('Error Cases', () => {
    it('should handle nonexistent tables', () => {
      expect(schemaInfo.getPrimaryKey('nonexistent')).toBe('');
      expect(schemaInfo.getColumnsInfo('nonexistent')).toEqual([]);
      expect(schemaInfo.getRequiredColumns('nonexistent')).toEqual([]);
      expect(schemaInfo.getChildTables('nonexistent')).toEqual([]);
      expect(schemaInfo.getForeignTables('nonexistent')).toEqual([]);
      expect(schemaInfo.getRelationships('nonexistent')).toEqual({});
      expect(schemaInfo.isPivot('nonexistent')).toBe(false);
      expect(schemaInfo.getHiddenColumns('nonexistent')).toEqual([]);
    });
  });

  describe('Hidden Columns', () => {
    it('should return hidden columns for user table', () => {
      const userHidden = schemaInfo.getHiddenColumns('user');
      expect(userHidden).toContain('password');
    });

    it('should return empty array for tables without hidden columns', () => {
      const productHidden = schemaInfo.getHiddenColumns('product');
      expect(productHidden).toEqual([]);
    });

    it('should match against the hiddenFields constant', () => {
      const allColumns = schemaInfo.getAllColumns('user');
      const hiddenColumns = schemaInfo.getHiddenColumns('user');

      // All hidden columns should be in the hiddenFields list
      hiddenColumns.forEach((column) => {
        expect(hiddenFields).toContain(column);
      });

      // All columns from hiddenFields that exist in the table should be hidden
      allColumns.forEach((column) => {
        if (hiddenFields.includes(column)) {
          expect(hiddenColumns).toContain(column);
        }
      });
    });
  });

  describe('View Tables', () => {
    it('should return empty array when no view tables exist', () => {
      const viewTables = schemaInfo.getViewTables();
      expect(viewTables).toEqual([]);
    });

    it('should return view tables with their queries', () => {
      const schemaWithViews: ISchemaInfo[] = [
        {
          tableName: 'users',
          columnsInfo: [
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              primary_key: true,
            },
          ],
          requiredColumns: ['user_id'],
          foreignKeys: [],
          foreignTables: [],
          childTables: [],
          hasOne: [],
          hasMany: [],
          belongsTo: [],
          belongsToMany: [],
          pivotRelationships: [],
        },
        {
          tableName: 'user_summary_view',
          columnsInfo: [
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
            },
            {
              column_name: 'total_posts',
              data_type: 'number',
              is_nullable: 'NO',
            },
          ],
          requiredColumns: [],
          foreignKeys: [],
          foreignTables: [],
          childTables: [],
          hasOne: [],
          hasMany: [],
          belongsTo: [],
          belongsToMany: [],
          pivotRelationships: [],
          viewQuery:
            'SELECT u.user_id, COUNT(p.post_id) as total_posts FROM users u LEFT JOIN posts p ON u.user_id = p.user_id GROUP BY u.user_id',
        },
        {
          tableName: 'posts',
          columnsInfo: [
            {
              column_name: 'post_id',
              data_type: 'number',
              is_nullable: 'NO',
              primary_key: true,
            },
          ],
          requiredColumns: ['post_id'],
          foreignKeys: [],
          foreignTables: [],
          childTables: [],
          hasOne: [],
          hasMany: [],
          belongsTo: [],
          belongsToMany: [],
          pivotRelationships: [],
        },
        {
          tableName: 'active_users_view',
          columnsInfo: [
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
            },
          ],
          requiredColumns: [],
          foreignKeys: [],
          foreignTables: [],
          childTables: [],
          hasOne: [],
          hasMany: [],
          belongsTo: [],
          belongsToMany: [],
          pivotRelationships: [],
          viewQuery: 'SELECT user_id FROM users WHERE active = true',
        },
      ];

      const schemaInfoWithViews = getSchemaInfo(schemaWithViews);
      const viewTables = schemaInfoWithViews.getViewTables();

      expect(viewTables).toHaveLength(2);
      expect(viewTables).toEqual([
        {
          tableName: 'user_summary_view',
          viewQuery:
            'SELECT u.user_id, COUNT(p.post_id) as total_posts FROM users u LEFT JOIN posts p ON u.user_id = p.user_id GROUP BY u.user_id',
        },
        {
          tableName: 'active_users_view',
          viewQuery: 'SELECT user_id FROM users WHERE active = true',
        },
      ]);
    });

    it('should handle view tables with empty viewQuery string', () => {
      const schemaWithEmptyViewQuery: ISchemaInfo[] = [
        {
          tableName: 'empty_view',
          columnsInfo: [],
          requiredColumns: [],
          foreignKeys: [],
          foreignTables: [],
          childTables: [],
          hasOne: [],
          hasMany: [],
          belongsTo: [],
          belongsToMany: [],
          pivotRelationships: [],
          viewQuery: '',
        },
      ];

      const schemaInfoWithEmptyView = getSchemaInfo(schemaWithEmptyViewQuery);
      const viewTables = schemaInfoWithEmptyView.getViewTables();

      expect(viewTables).toHaveLength(1);
      expect(viewTables[0]?.tableName).toBe('empty_view');
      expect(viewTables[0]?.viewQuery).toBe('');
    });
  });
});
