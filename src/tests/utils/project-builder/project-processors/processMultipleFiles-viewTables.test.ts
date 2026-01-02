import { describe, it, expect } from 'vitest';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('processMultipleFiles - View Table Exclusion', () => {
  /**
   * Creates a mock schema info with the specified table names.
   * Optionally marks tables as views by setting viewQuery.
   */
  const createMockSchemaInfo = (
    tables: { name: string; isView?: boolean; viewQuery?: string }[],
  ): ISchemaInfo[] => {
    return tables.map(({ name, isView, viewQuery }) => ({
      tableName: name,
      columnsInfo: [
        {
          column_name: `${name}_id`,
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
      ],
      requiredColumns: [`${name}_id`, 'name'],
      foreignKeys: [],
      foreignTables: [],
      childTables: [],
      isPivot: undefined,
      hasOne: [],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
      ...(isView === true && {
        viewQuery:
          viewQuery ??
          `SELECT ${name}_id, name FROM ${name.replace('_view', '')}`,
        viewStructure: [name.replace('_view', '')],
      }),
    }));
  };

  const createMockUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'Test',
          children: [
            {
              type: 'folder',
              name: 'templates',
              children: [
                {
                  type: 'file',
                  name: 'migration.sql.txt',
                  content: 'CREATE TABLE {{tableNameSnakeCase}} (id INT);',
                },
                {
                  type: 'file',
                  name: 'controller.txt',
                  content:
                    'export class {{tableNamePascalCaseSingular}}Controller {}',
                },
              ],
            },
            {
              type: 'file',
              name: 'structure.yaml',
              content: 'test',
            },
          ],
        },
      ],
    },
  ];

  describe('Default behavior - view tables excluded', () => {
    it('should exclude view tables by default in FILE_LOOP', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'post_statistics_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Should only generate files for base tables, not views */
      expect(result).toHaveLength(3);
      expect(result.some((file) => file.name.includes('users'))).toBe(true);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(result.some((file) => file.name.includes('comments'))).toBe(true);
      expect(
        result.some((file) => file.name.includes('user_summary_view')),
      ).toBe(false);
      expect(
        result.some((file) => file.name.includes('post_statistics_view')),
      ).toBe(false);
    });

    it('should exclude view tables even when they have viewStructure defined', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'products', isView: false },
        {
          name: 'product_summary_view',
          isView: true,
          viewQuery: 'SELECT * FROM products WHERE active = true',
        },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}Controller.ts',
        options: {
          template: './templates/controller.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      expect(result).toHaveLength(1);
      expect(result.some((file) => file.name.includes('products'))).toBe(true);
      expect(
        result.some((file) => file.name.includes('product_summary_view')),
      ).toBe(false);
    });

    it('should handle schema with only view tables (should return empty array)', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'view1', isView: true },
        { name: 'view2', isView: true },
        { name: 'view3', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      expect(result).toHaveLength(0);
    });

    it('should handle mixed schema with views, base tables, and pivot tables', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_posts_view', isView: true },
        { name: 'user_post_likes', isView: false }, // pivot table
      ]);

      /* Mark pivot table */
      const pivotTable = schemaInfo.find(
        (t) => t.tableName === 'user_post_likes',
      );
      if (pivotTable) {
        pivotTable.isPivot = true;
      }

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Should include base tables and pivot tables, but exclude views */
      expect(result).toHaveLength(3);
      expect(result.some((file) => file.name.includes('users'))).toBe(true);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(result.some((file) => file.name.includes('user_post_likes'))).toBe(
        true,
      );
      expect(result.some((file) => file.name.includes('user_posts_view'))).toBe(
        false,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle view table with empty viewQuery string (should exclude as view)', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
      ]);

      /* Add a table with empty viewQuery (edge case - empty string is still a view) */
      schemaInfo.push({
        tableName: 'edge_case_view',
        columnsInfo: [
          {
            column_name: 'id',
            data_type: 'number',
            is_nullable: 'NO',
            primary_key: true,
          },
        ],
        requiredColumns: ['id'],
        foreignKeys: [],
        foreignTables: [],
        childTables: [],
        isPivot: undefined,
        hasOne: [],
        hasMany: [],
        belongsTo: [],
        belongsToMany: [],
        pivotRelationships: [],
        viewQuery: '', // Empty string - still treated as view if defined
      });

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Empty string viewQuery should be excluded as view */
      expect(result).toHaveLength(2);
      expect(result.some((file) => file.name.includes('users'))).toBe(true);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(result.some((file) => file.name.includes('edge_case_view'))).toBe(
        false,
      );
    });

    it('should include base tables without viewQuery property (undefined)', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
      ]);

      /* Add a base table without viewQuery property (undefined) */
      schemaInfo.push({
        tableName: 'base_table',
        columnsInfo: [
          {
            column_name: 'id',
            data_type: 'number',
            is_nullable: 'NO',
            primary_key: true,
          },
        ],
        requiredColumns: ['id'],
        foreignKeys: [],
        foreignTables: [],
        childTables: [],
        isPivot: undefined,
        hasOne: [],
        hasMany: [],
        belongsTo: [],
        belongsToMany: [],
        pivotRelationships: [],
        /* viewQuery is undefined (not set) - this is a base table */
      });

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Undefined viewQuery means base table - should be included */
      expect(result).toHaveLength(3);
      expect(result.some((file) => file.name.includes('users'))).toBe(true);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(result.some((file) => file.name.includes('base_table'))).toBe(
        true,
      );
    });
  });

  describe('Integration with --ignore flag', () => {
    it('should exclude view tables AND manually ignored tables', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'comments', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'post_statistics_view', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
          ignore: 'users,comments',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Should only generate file for posts (users and comments ignored, views excluded) */
      expect(result).toHaveLength(1);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(result.some((file) => file.name.includes('users'))).toBe(false);
      expect(result.some((file) => file.name.includes('comments'))).toBe(false);
      expect(
        result.some((file) => file.name.includes('user_summary_view')),
      ).toBe(false);
      expect(
        result.some((file) => file.name.includes('post_statistics_view')),
      ).toBe(false);
    });
  });

  describe('Integration with --include-table flag', () => {
    it('should still exclude view tables even when using --include-table', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNameSnakeCase}}.sql',
        options: {
          template: './templates/migration.sql.txt',
          'include-table': '{{tableName}}',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Should include base tables but exclude views */
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((file) => file.name.includes('users'))).toBe(true);
      expect(result.some((file) => file.name.includes('posts'))).toBe(true);
      expect(
        result.some((file) => file.name.includes('user_summary_view')),
      ).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complex schema with multiple views referencing base tables', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'comments', isView: false },
        {
          name: 'active_users_view',
          isView: true,
          viewQuery: 'SELECT * FROM users WHERE active = true',
        },
        {
          name: 'post_comments_summary_view',
          isView: true,
          viewQuery:
            'SELECT p.id, COUNT(c.id) as comment_count FROM posts p LEFT JOIN comments c ON p.id = c.post_id GROUP BY p.id',
        },
        {
          name: 'user_activity_view',
          isView: true,
          viewQuery:
            'SELECT u.id, COUNT(p.id) as post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id',
        },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles = createMockUserFiles();

      const result = await processMultipleFiles({
        command: '{{tableNamePascalCaseSingular}}Controller.ts',
        options: {
          template: './templates/controller.txt',
        },
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
      });

      /* Should only generate controllers for base tables */
      expect(result).toHaveLength(3);

      /* Get actual file names for debugging */
      const fileNames = result.map((file) => file.name);

      /* Check for base tables - verify they exist in the result */
      const hasUsers = fileNames.some((name) =>
        name.toLowerCase().includes('user'),
      );
      const hasPosts = fileNames.some((name) =>
        name.toLowerCase().includes('post'),
      );
      const hasComments = fileNames.some((name) =>
        name.toLowerCase().includes('comment'),
      );

      expect(hasUsers).toBe(true);
      expect(hasPosts).toBe(true);
      expect(hasComments).toBe(true);

      /* Verify views are excluded */
      const hasActiveUsersView = fileNames.some((name) =>
        name.toLowerCase().includes('active'),
      );
      const hasPostCommentsSummary = fileNames.some((name) =>
        name.toLowerCase().includes('summary'),
      );
      const hasUserActivity = fileNames.some((name) =>
        name.toLowerCase().includes('activity'),
      );

      expect(hasActiveUsersView).toBe(false);
      expect(hasPostCommentsSummary).toBe(false);
      expect(hasUserActivity).toBe(false);
    });
  });
});
