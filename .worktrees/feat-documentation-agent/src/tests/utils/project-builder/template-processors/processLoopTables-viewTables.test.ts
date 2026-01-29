import { describe, it, expect } from 'vitest';
import {
  processLoopTables,
  processLoopTablesReversed,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('processLoopTables - View Table Exclusion', () => {
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

  const userFiles: IStructure = [];
  const formData = undefined;
  const userMetadata = null;

  describe('LOOP(tables) - Default behavior', () => {
    it('should exclude view tables by default in LOOP(tables)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'post_statistics_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      /* Should only include base tables, not views */
      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
      expect(result).not.toContain('post_statistics_view');
    });

    it('should handle schema with only view tables (should return empty)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'view1', isView: true },
        { name: 'view2', isView: true },
        { name: 'view3', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result.trim()).toBe('');
    });

    it('should handle mixed schema with views, base tables, and pivot tables', () => {
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

      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      /* Should include base tables and pivot tables, but exclude views */
      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('user_post_likes');
      expect(result).not.toContain('user_posts_view');
    });
  });

  describe('LOOP(tablesReversed) - Default behavior', () => {
    it('should exclude view tables by default in LOOP(tablesReversed)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'post_statistics_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `[[LOOP(tablesReversed) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTablesReversed(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      /* Should only include base tables, not views */
      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
      expect(result).not.toContain('post_statistics_view');
    });

    it('should maintain reverse order while excluding views', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `[[LOOP(tablesReversed) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTablesReversed(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      const lines = result.trim().split('\n');
      /* Should be in reverse order: comments, posts, users */
      expect(lines[0]).toBe('comments');
      expect(lines[1]).toBe('posts');
      expect(lines[2]).toBe('users');
      expect(lines).not.toContain('user_summary_view');
    });
  });

  describe('HTML-like syntax <@@LOOP@@ data="tables">', () => {
    it('should exclude view tables in <@@LOOP@@ data="tables">', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `<@@LOOP@@ data="tables" separator="\\n">{{tableName}}</@@LOOP@@>`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
    });

    it('should exclude view tables in <@@LOOP@@ data="tablesReversed">', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `<@@LOOP@@ data="tablesReversed" separator="\\n">{{tableName}}</@@LOOP@@>`;
      const result = processLoopTablesReversed(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
    });
  });

  describe('@LOOP(tables) experimental syntax', () => {
    it('should exclude view tables in @LOOP(tables)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `@LOOP(tables)
{{tableName}}
@/LOOP --separator="\\n"`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
    });

    it('should exclude view tables in @LOOP(tablesReversed)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `@LOOP(tablesReversed)
{{tableName}}
@/LOOP --separator="\\n"`;
      const result = processLoopTablesReversed(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('comments');
      expect(result).not.toContain('user_summary_view');
    });
  });

  describe('Edge cases', () => {
    it('should exclude view table with empty viewQuery string', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
      ]);

      /* Add a table with empty viewQuery */
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
        viewQuery: '', // Empty string - still treated as view
      });

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).not.toContain('edge_case_view');
    });

    it('should include base tables without viewQuery property (undefined)', () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
      ]);

      /* Add a base table without viewQuery property */
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

      const template = `[[LOOP(tables) --template="{{tableName}}" --separator="\\n"]]`;
      const result = processLoopTables(
        template,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      expect(result).toContain('users');
      expect(result).toContain('posts');
      expect(result).toContain('base_table');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complex template with multiple LOOP commands excluding views', () => {
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
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      /* Test LOOP(tables) separately */
      const createTemplate = `[[LOOP(tables) --template="CREATE TABLE \\"{{tableName}}\\" (id INT);" --separator="\\n\\n"]]`;
      const createResult = processLoopTables(
        createTemplate,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      /* Test LOOP(tablesReversed) separately */
      const dropTemplate = `[[LOOP(tablesReversed) --template="DROP TABLE IF EXISTS \\"{{tableName}}\\";" --separator="\\n"]]`;
      const dropResult = processLoopTablesReversed(
        dropTemplate,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );

      /* Should only include base tables in both DROP and CREATE sections */
      expect(dropResult).toContain('DROP TABLE IF EXISTS "users"');
      expect(dropResult).toContain('DROP TABLE IF EXISTS "posts"');
      expect(dropResult).toContain('DROP TABLE IF EXISTS "comments"');
      expect(createResult).toContain('CREATE TABLE "users"');
      expect(createResult).toContain('CREATE TABLE "posts"');
      expect(createResult).toContain('CREATE TABLE "comments"');
      expect(dropResult).not.toContain('active_users_view');
      expect(dropResult).not.toContain('post_comments_summary_view');
      expect(createResult).not.toContain('active_users_view');
      expect(createResult).not.toContain('post_comments_summary_view');
    });
  });
});
