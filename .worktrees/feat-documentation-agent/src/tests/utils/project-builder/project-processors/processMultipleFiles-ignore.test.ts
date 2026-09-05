import { describe, it, expect } from 'vitest';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('processMultipleFiles with --ignore flag', () => {
  const createMockSchemaInfo = (tableNames: string[]): ISchemaInfo[] => {
    return tableNames.map((name) => ({
      tableName: name,
      columnsInfo: [],
      requiredColumns: [],
      foreignKeys: [],
      foreignTables: [],
      childTables: [],
      isPivot: undefined,
      hasOne: [],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    }));
  };

  it('should ignore tables specified in --ignore flag with USE_CONSTANT using relative path', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'App Generator - Spring Boot',
            children: [
              {
                type: 'folder',
                name: 'constants',
                children: [
                  {
                    type: 'file',
                    name: 'ignoredTables.yaml',
                    content: `- users
- sessions
- cache`,
                  },
                ],
              },
              {
                type: 'folder',
                name: 'templates',
                children: [
                  {
                    type: 'file',
                    name: 'migration.sql.txt',
                    content: 'CREATE TABLE {{tableNameSnakeCase}} (id INT);',
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

    const schemaInfo = createMockSchemaInfo([
      'users',
      'posts',
      'sessions',
      'comments',
      'cache',
    ]);

    const schemaInfoParsed = getSchemaInfo(schemaInfo);

    const result = await processMultipleFiles({
      command:
        "{{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql",
      options: {
        ignore: 'USE_CONSTANT(./constants/ignoredTables.yaml)',
        template: './templates/migration.sql.txt',
      },
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/App Generator - Spring Boot/structure.yaml',
      formData: undefined,
      userMetadata: null,
    });

    /* Should only generate files for posts and comments (users, sessions, cache are ignored) */
    expect(result).toHaveLength(2);
    expect(result.some((file) => file.name.includes('posts'))).toBe(true);
    expect(result.some((file) => file.name.includes('comments'))).toBe(true);
    expect(result.some((file) => file.name.includes('users'))).toBe(false);
    expect(result.some((file) => file.name.includes('sessions'))).toBe(false);
    expect(result.some((file) => file.name.includes('cache'))).toBe(false);
  });

  it('should ignore tables specified in --ignore flag with USE_CONSTANT using absolute path', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'App Generator - Spring Boot',
            children: [
              {
                type: 'folder',
                name: 'constants',
                children: [
                  {
                    type: 'file',
                    name: 'ignoredTables.yaml',
                    content: `- admin_users
- audit_logs`,
                  },
                ],
              },
              {
                type: 'folder',
                name: 'templates',
                children: [
                  {
                    type: 'file',
                    name: 'migration.sql.txt',
                    content: 'CREATE TABLE {{tableNameSnakeCase}} (id INT);',
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

    const schemaInfo = createMockSchemaInfo([
      'admin_users',
      'posts',
      'audit_logs',
      'comments',
    ]);

    const schemaInfoParsed = getSchemaInfo(schemaInfo);

    const result = await processMultipleFiles({
      command:
        "{{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql",
      options: {
        ignore:
          'USE_CONSTANT(/Projects/App Generator - Spring Boot/constants/ignoredTables.yaml)',
        template: './templates/migration.sql.txt',
      },
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/App Generator - Spring Boot/structure.yaml',
      formData: undefined,
      userMetadata: null,
    });

    /* Should only generate files for posts and comments */
    expect(result).toHaveLength(2);
    expect(result.some((file) => file.name.includes('posts'))).toBe(true);
    expect(result.some((file) => file.name.includes('comments'))).toBe(true);
    expect(result.some((file) => file.name.includes('admin_users'))).toBe(
      false,
    );
    expect(result.some((file) => file.name.includes('audit_logs'))).toBe(false);
  });

  it('should ignore tables specified directly in --ignore flag (without USE_CONSTANT)', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'App Generator - Spring Boot',
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
                ],
              },
            ],
          },
        ],
      },
    ];

    const schemaInfo = createMockSchemaInfo(['users', 'posts', 'sessions']);

    const schemaInfoParsed = getSchemaInfo(schemaInfo);

    const result = await processMultipleFiles({
      command:
        "{{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql",
      options: {
        ignore: 'users,sessions',
        template: './templates/migration.sql.txt',
      },
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/App Generator - Spring Boot/structure.yaml',
      formData: undefined,
      userMetadata: null,
    });

    /* Should only generate file for posts */
    expect(result).toHaveLength(1);
    expect(result.some((file) => file.name.includes('posts'))).toBe(true);
    expect(result.some((file) => file.name.includes('users'))).toBe(false);
    expect(result.some((file) => file.name.includes('sessions'))).toBe(false);
  });

  it('should handle empty ignore list gracefully', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'App Generator - Spring Boot',
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
                ],
              },
            ],
          },
        ],
      },
    ];

    const schemaInfo = createMockSchemaInfo(['users', 'posts']);

    const schemaInfoParsed = getSchemaInfo(schemaInfo);

    const result = await processMultipleFiles({
      command:
        "{{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql",
      options: {
        ignore: '',
        template: './templates/migration.sql.txt',
      },
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/App Generator - Spring Boot/structure.yaml',
      formData: undefined,
      userMetadata: null,
    });

    /* Should generate files for all tables */
    expect(result).toHaveLength(2);
  });
});
