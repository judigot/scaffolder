import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import {
  addRelationship,
  purgeForeignKeyTraces,
} from '@/helpers/relationshipHelper.ts';

describe('relationshipHelper', () => {
  describe('addRelationship', () => {
    let baseSchema: ISchemaInfo[];

    beforeEach(() => {
      // Reset the base schema before each test
      baseSchema = [
        {
          tableName: 'user',
          columnsInfo: [
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
          ],
          requiredColumns: ['user_id'],
        },
      ];
    });

    describe('error cases', () => {
      it('should throw error when source table does not exist', () => {
        expect(() =>
          addRelationship(baseSchema, 'nonexistent', 'hasOne', 'post'),
        ).toThrow('Source table "nonexistent" not found in schema');
      });
    });

    describe('one-to-one relationships', () => {
      it('should create a new target table with proper foreign key when target does not exist', () => {
        const result = addRelationship(baseSchema, 'user', 'hasOne', 'profile');

        // Check source table (user)
        const sourceTable = result.find((t) => t.tableName === 'user');
        expect(sourceTable?.hasOne).toContain('profile');
        expect(sourceTable?.childTables).toContain('profile');

        // Check target table (profile)
        const targetTable = result.find((t) => t.tableName === 'profile');
        expect(targetTable).toBeDefined();
        expect(targetTable?.columnsInfo).toHaveLength(2); // Primary key + foreign key
        expect(targetTable?.columnsInfo[1]).toEqual({
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          unique: true, // One-to-one should be unique
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        });
        expect(targetTable?.belongsTo).toContain('user');
        expect(targetTable?.foreignTables).toContain('user');
        expect(targetTable?.foreignKeys).toContain('user_id');
        expect(targetTable?.requiredColumns).toContain('user_id');
      });

      it('should update existing target table with proper foreign key', () => {
        // Add a profile table first
        baseSchema.push({
          tableName: 'profile',
          columnsInfo: [
            {
              column_name: 'profile_id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
          ],
          requiredColumns: ['profile_id'],
        });

        const result = addRelationship(baseSchema, 'user', 'hasOne', 'profile');

        // Verify the relationship was set up correctly
        const targetTable = result.find((t) => t.tableName === 'profile');
        expect(targetTable?.columnsInfo).toHaveLength(2);
        expect(targetTable?.foreignKeys).toContain('user_id');
        expect(targetTable?.belongsTo).toContain('user');
      });
    });

    describe('one-to-many relationships', () => {
      it('should create a new target table with proper foreign key when target does not exist', () => {
        const result = addRelationship(baseSchema, 'user', 'hasMany', 'post');

        // Check source table (user)
        const sourceTable = result.find((t) => t.tableName === 'user');
        expect(sourceTable?.hasMany).toContain('post');
        expect(sourceTable?.childTables).toContain('post');

        // Check target table (post)
        const targetTable = result.find((t) => t.tableName === 'post');
        expect(targetTable).toBeDefined();
        expect(targetTable?.columnsInfo).toHaveLength(2); // Primary key + foreign key
        expect(targetTable?.columnsInfo[1]).toEqual({
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        });
        expect(targetTable?.belongsTo).toContain('user');
        expect(targetTable?.foreignTables).toContain('user');
        expect(targetTable?.foreignKeys).toContain('user_id');
        expect(targetTable?.requiredColumns).toContain('user_id');
      });
    });

    describe('many-to-many relationships', () => {
      it('should create new target and pivot tables with proper relationships', () => {
        const result = addRelationship(
          baseSchema,
          'user',
          'belongsToMany',
          'role',
        );

        // Check source table (user)
        const sourceTable = result.find((t) => t.tableName === 'user');
        expect(sourceTable?.belongsToMany).toContain('role');
        expect(sourceTable?.hasMany).toContain('user_role');
        expect(sourceTable?.childTables).toContain('user_role');
        expect(sourceTable?.pivotRelationships).toContainEqual({
          relatedTable: 'role',
          pivotTable: 'user_role',
        });

        // Check target table (role)
        const targetTable = result.find((t) => t.tableName === 'role');
        expect(targetTable?.belongsToMany).toContain('user');
        expect(targetTable?.hasMany).toContain('user_role');
        expect(targetTable?.childTables).toContain('user_role');
        expect(targetTable?.pivotRelationships).toContainEqual({
          relatedTable: 'user',
          pivotTable: 'user_role',
        });

        // Check pivot table (user_role)
        const pivotTable = result.find((t) => t.tableName === 'user_role');
        expect(pivotTable).toBeDefined();
        expect(pivotTable?.isPivot).toBe(true);
        expect(pivotTable?.columnsInfo).toHaveLength(3); // Primary key + 2 foreign keys
        expect(pivotTable?.columnsInfo[1]).toEqual({
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        });
        expect(pivotTable?.columnsInfo[2]).toEqual({
          column_name: 'role_id',
          data_type: 'number',
          is_nullable: 'NO',
          foreign_key: {
            foreign_table_name: 'role',
            foreign_column_name: 'role_id',
          },
        });
        expect(pivotTable?.belongsTo).toContain('user');
        expect(pivotTable?.belongsTo).toContain('role');
        expect(pivotTable?.foreignTables).toContain('user');
        expect(pivotTable?.foreignTables).toContain('role');
        expect(pivotTable?.foreignKeys).toContain('user_id');
        expect(pivotTable?.foreignKeys).toContain('role_id');
        expect(pivotTable?.requiredColumns).toContain('user_role_id');
        expect(pivotTable?.requiredColumns).toContain('user_id');
        expect(pivotTable?.requiredColumns).toContain('role_id');
      });

      it('should reuse existing target table and create pivot table', () => {
        // Add a role table first
        baseSchema.push({
          tableName: 'role',
          columnsInfo: [
            {
              column_name: 'role_id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
          ],
          requiredColumns: ['role_id'],
        });

        const result = addRelationship(
          baseSchema,
          'user',
          'belongsToMany',
          'role',
        );

        // Verify the pivot table was created and relationships set up correctly
        const pivotTable = result.find((t) => t.tableName === 'user_role');
        expect(pivotTable).toBeDefined();
        expect(pivotTable?.isPivot).toBe(true);
      });
    });
  });

  describe('purgeForeignKeyTraces', () => {
    it('should remove all traces of non-existent tables', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'post',
          columnsInfo: [
            {
              column_name: 'post_id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              unique: true,
              foreign_key: {
                foreign_table_name: 'user',
                foreign_column_name: 'user_id',
              },
            },
          ],
          requiredColumns: ['post_id', 'user_id'],
          foreignTables: ['user'],
          foreignKeys: ['user_id'],
          belongsTo: ['user'],
          hasMany: ['comment'],
          childTables: ['comment'],
          pivotRelationships: [{ relatedTable: 'tag', pivotTable: 'post_tag' }],
        },
      ];

      const result = purgeForeignKeyTraces(schema);
      const postTable = result[0];

      // Column should be removed
      expect(postTable.columnsInfo).toHaveLength(1);
      expect(
        postTable.columnsInfo.find((c) => c.column_name === 'user_id'),
      ).toBeUndefined();

      // All references should be removed
      expect(postTable.foreignTables).toBeUndefined();
      expect(postTable.foreignKeys).toBeUndefined();
      expect(postTable.belongsTo).toBeUndefined();
      expect(postTable.hasMany).toBeUndefined();
      expect(postTable.childTables).toBeUndefined();
      expect(postTable.pivotRelationships).toBeUndefined();
      expect(postTable.requiredColumns).toEqual(['post_id']);
    });

    it('should not modify tables with valid relationships', () => {
      const schema: ISchemaInfo[] = [
        {
          tableName: 'user',
          columnsInfo: [
            {
              column_name: 'user_id',
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
          ],
          requiredColumns: ['user_id'],
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
              column_default: 'AUTO_INCREMENT',
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
          ],
          requiredColumns: ['post_id', 'user_id'],
          foreignTables: ['user'],
          foreignKeys: ['user_id'],
          belongsTo: ['user'],
        },
      ];

      const result = purgeForeignKeyTraces(schema);

      // Schema should remain unchanged
      expect(result).toEqual(schema);
    });
  });
});
