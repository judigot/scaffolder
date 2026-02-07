import { describe, it, expect } from 'vitest';
import { processDynamicFolders } from '@/utils/project-builder/project-processors/processDynamicFolders.ts';
import type { IStructure, IFolder } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('processDynamicFolders - View Table Exclusion', () => {
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

  describe('Default behavior - view tables excluded', () => {
    it('should exclude view tables by default in FOLDER_LOOP', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'posts', isView: false },
        { name: 'user_summary_view', isView: true },
        { name: 'post_statistics_view', isView: true },
        { name: 'comments', isView: false },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles: IStructure = [];

      const result = await processDynamicFolders({
        folderName: '{{tableName.plural.kebabCase}}',
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: undefined,
        currentPath: '',
      });

      /* Should only create folders for base tables, not views */
      expect(result).toHaveLength(3);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('users'),
        ),
      ).toBe(true);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('posts'),
        ),
      ).toBe(true);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('comments'),
        ),
      ).toBe(true);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('user_summary_view'),
        ),
      ).toBe(false);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' &&
            item.name.includes('post_statistics_view'),
        ),
      ).toBe(false);
    });

    it('should handle schema with only view tables (should return empty array)', async () => {
      const schemaInfo = createMockSchemaInfo([
        { name: 'view1', isView: true },
        { name: 'view2', isView: true },
        { name: 'view3', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const userFiles: IStructure = [];

      const result = await processDynamicFolders({
        folderName: '{{tableName.plural.kebabCase}}',
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: undefined,
        currentPath: '',
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
      const userFiles: IStructure = [];

      const result = await processDynamicFolders({
        folderName: '{{tableName.plural.kebabCase}}',
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: undefined,
        currentPath: '',
      });

      /* Should include base tables and pivot tables, but exclude views */
      expect(result).toHaveLength(3);
      const folderNames = result
        .filter((item): item is IFolder => item.type === 'folder')
        .map((item) => item.name.toLowerCase());

      expect(folderNames.some((name) => name.includes('user'))).toBe(true);
      expect(folderNames.some((name) => name.includes('post'))).toBe(true);
      expect(folderNames.some((name) => name.includes('like'))).toBe(true);
      expect(folderNames.some((name) => name.includes('view'))).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should exclude view table with empty viewQuery string', async () => {
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
      const userFiles: IStructure = [];

      const result = await processDynamicFolders({
        folderName: '{{tableName.plural.kebabCase}}',
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: undefined,
        currentPath: '',
      });

      /* Empty string viewQuery should be excluded as view */
      expect(result).toHaveLength(2);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('users'),
        ),
      ).toBe(true);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('posts'),
        ),
      ).toBe(true);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes('edge_case_view'),
        ),
      ).toBe(false);
    });

    it('should include base tables without viewQuery property (undefined)', async () => {
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
      const userFiles: IStructure = [];

      const result = await processDynamicFolders({
        folderName: '{{tableName.plural.kebabCase}}',
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: undefined,
        currentPath: '',
      });

      /* Undefined viewQuery means base table - should be included */
      expect(result).toHaveLength(3);
      const folderNames = result
        .filter((item): item is IFolder => item.type === 'folder')
        .map((item) => item.name.toLowerCase());

      expect(folderNames.some((name) => name.includes('user'))).toBe(true);
      expect(folderNames.some((name) => name.includes('post'))).toBe(true);
      expect(folderNames.some((name) => name.includes('base'))).toBe(true);
    });
  });

  describe('Integration with --data-source flag', () => {
    it('should not exclude view tables when using --data-source (data-source mode)', async () => {
      /* When using --data-source, we're iterating over data files, not schema tables */
      /* So view table exclusion should not apply */
      const userFiles: IStructure = [
        {
          type: 'folder',
          name: 'DataSources',
          children: [
            {
              type: 'folder',
              name: 'People',
              children: [
                {
                  type: 'folder',
                  name: 'john-doe',
                  children: [
                    {
                      type: 'file',
                      name: 'info.yaml',
                      content: `basic-info:
  name: John Doe`,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = createMockSchemaInfo([
        { name: 'users', isView: false },
        { name: 'user_summary_view', isView: true },
      ]);

      const schemaInfoParsed = getSchemaInfo(schemaInfo);

      const result = await processDynamicFolders({
        folderName: "{{basic-info.name}}'s Files",
        children: [],
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath: '/Projects/Test/structure.yaml',
        formData: undefined,
        userMetadata: null,
        options: {
          'data-source': '/DataSources/People/**/info.yaml',
        },
        currentPath: '',
      });

      /* With --data-source, we iterate over data files, not schema tables */
      /* So view exclusion doesn't apply - should create folder from data */
      expect(result).toHaveLength(1);
      expect(
        result.some(
          (item): item is IFolder =>
            item.type === 'folder' && item.name.includes("John Doe's Files"),
        ),
      ).toBe(true);
    });
  });
});
