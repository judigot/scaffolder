import { describe, it, expect } from 'vitest';
import useSchemaInfo from '@/utils/useSchemaInfo.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';

describe('useSchemaInfo', () => {
  const schemaInfo = useSchemaInfo(masterSchema);

  it('should return all table names', () => {
    expect(schemaInfo.tableNames).toEqual([
      'product',
      'customer',
      'order',
      'order_product',
      'user',
      'profile',
      'posts'
    ]);
  });

  it('should identify pivot tables', () => {
    expect(schemaInfo.pivotTables).toEqual(['order_product']);
  });

  describe('Primary Keys', () => {
    it('should return primary key for many-to-many tables', () => {
      expect(schemaInfo.getPrimaryKey('product')).toBe('product_id');
      expect(schemaInfo.getPrimaryKey('order')).toBe('order_id');
      expect(schemaInfo.getPrimaryKey('order_product')).toBe('order_product_id');
    });

    it('should return primary key for one-to-one tables', () => {
      expect(schemaInfo.getPrimaryKey('user')).toBe('user_id');
      expect(schemaInfo.getPrimaryKey('profile')).toBe('profile_id');
    });

    it('should return primary key for one-to-many tables', () => {
      expect(schemaInfo.getPrimaryKey('posts')).toBe('post_id');
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
          pivotTable: 'order_product'
        }
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
      const userIdColumn = profileColumns.find(col => col.column_name === 'user_id');
      expect(userIdColumn?.unique).toBe(true);
    });

    it('should handle non-unique foreign keys (one-to-many)', () => {
      const postsColumns = schemaInfo.getColumnsInfo('posts');
      const userIdColumn = postsColumns.find(col => col.column_name === 'user_id');
      expect(userIdColumn?.unique).toBeUndefined();
    });

    it('should return foreign tables', () => {
      expect(schemaInfo.getForeignTables('order')).toEqual(['customer']);
      expect(schemaInfo.getForeignTables('order_product')).toEqual(['order', 'product']);
      expect(schemaInfo.getForeignTables('posts')).toEqual(['user']);
    });
  });

  describe('Required Columns', () => {
    it('should return required columns for user table', () => {
      const userRequired = schemaInfo.getRequiredColumns('user');
      ['user_id', 'first_name', 'last_name', 'email', 'username', 'password'].forEach(col => {
        expect(userRequired).toContain(col);
      });
    });

    it('should return required columns for pivot table', () => {
      const orderProductRequired = schemaInfo.getRequiredColumns('order_product');
      expect(orderProductRequired).toEqual(['order_product_id', 'order_id', 'product_id']);
    });

    it('should handle nullable columns', () => {
      const postsColumns = schemaInfo.getColumnsInfo('posts');
      const contentColumn = postsColumns.find(col => col.column_name === 'content');
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
        'updated_at'
      ]);
    });

    it('should return all columns for pivot table', () => {
      const orderProductColumns = schemaInfo.getAllColumns('order_product');
      expect(orderProductColumns).toEqual([
        'order_product_id',
        'order_id',
        'product_id'
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
    });
  });
});
