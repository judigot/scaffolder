import { describe, it, expect } from 'vitest';
import {
  schemaMatchesFilter,
  filterCompatibleProjects,
  getAllProjects,
} from '@/utils/project-builder/utils/filterCompatibleProjects.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

const createMockSchema = (
  tableName: string,
  columns: { name: string; type: string; foreignKey?: { table: string; column: string } }[],
): ISchemaInfo => ({
  tableName,
  columnsInfo: columns.map((col) => ({
    column_name: col.name,
    data_type: col.type,
    is_nullable: 'NO',
    ...(col.foreignKey && {
      foreign_key: {
        foreign_table_name: col.foreignKey.table,
        foreign_column_name: col.foreignKey.column,
      },
    }),
  })),
});

describe('schemaMatchesFilter', () => {
  const authSchema: ISchemaInfo[] = [
    createMockSchema('user', [
      { name: 'id', type: 'uuid' },
      { name: 'email', type: 'varchar(255)' },
    ]),
    createMockSchema('session', [
      { name: 'id', type: 'varchar(255)' },
      { name: 'userId', type: 'uuid', foreignKey: { table: 'user', column: 'id' } },
    ]),
  ];

  it('should match when no filter specified', () => {
    expect(schemaMatchesFilter(authSchema, [])).toBe(true);
  });

  it('should match table existence', () => {
    expect(schemaMatchesFilter(authSchema, ['user'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['session'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['nonexistent'])).toBe(false);
  });

  it('should match column existence', () => {
    expect(schemaMatchesFilter(authSchema, ['user.id'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user.email'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user.nonexistent'])).toBe(false);
  });

  it('should match property values', () => {
    expect(schemaMatchesFilter(authSchema, ['user.id.data_type=uuid'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user.id.dataType=uuid'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user.id.data_type=bigint'])).toBe(false);
  });

  it('should match foreign key existence', () => {
    expect(schemaMatchesFilter(authSchema, ['session.userId.foreign_key'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['session.userId.foreignKey'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user.id.foreign_key'])).toBe(false);
  });

  it('should match wildcard for any tables', () => {
    expect(schemaMatchesFilter(authSchema, ['*'])).toBe(true);
    expect(schemaMatchesFilter([], ['*'])).toBe(false);
  });

  it('should match $schema_name filter', () => {
    expect(schemaMatchesFilter(authSchema, ['$schema_name=auth-*'], 'auth-basic-uuid')).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['$schema_name=*-uuid'], 'auth-basic-uuid')).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['$schema_name=auth-*'], 'my-custom')).toBe(false);
  });

  it('should require all filters to pass (AND logic)', () => {
    expect(schemaMatchesFilter(authSchema, ['user', 'session'])).toBe(true);
    expect(schemaMatchesFilter(authSchema, ['user', 'nonexistent'])).toBe(false);
    expect(
      schemaMatchesFilter(authSchema, ['user', 'session', 'user.id.data_type=uuid']),
    ).toBe(true);
  });
});

describe('getAllProjects', () => {
  const mockUserFiles: IStructure = [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'test-project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: `
$SCHEMA_FILTER:
  - "user"
  - "user.id.data_type=uuid"

$USE_CORE:
  - /Core/drizzle-data
  - /Core/auth-services

api:
  CREATE_FILE(index.ts):
`,
            },
          ],
        },
      ],
    },
  ];

  it('should extract projects with $SCHEMA_FILTER and $USE_CORE', () => {
    const projects = getAllProjects(mockUserFiles);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('test-project');
    expect(projects[0].schemaFilter).toEqual(['user', 'user.id.data_type=uuid']);
    expect(projects[0].useCores).toEqual(['/Core/drizzle-data', '/Core/auth-services']);
  });
});

describe('filterCompatibleProjects', () => {
  const mockUserFiles: IStructure = [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'uuid-project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: `
$SCHEMA_FILTER:
  - "user"
  - "user.id.data_type=uuid"
`,
            },
          ],
        },
        {
          type: 'folder',
          name: 'integer-project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: `
$SCHEMA_FILTER:
  - "user"
  - "user.id.data_type=bigint"
`,
            },
          ],
        },
        {
          type: 'folder',
          name: 'any-project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: `
$SCHEMA_FILTER:
  - "*"
`,
            },
          ],
        },
      ],
    },
  ];

  const uuidSchema: ISchemaInfo[] = [
    createMockSchema('user', [{ name: 'id', type: 'uuid' }]),
  ];

  const integerSchema: ISchemaInfo[] = [
    createMockSchema('user', [{ name: 'id', type: 'bigint' }]),
  ];

  it('should filter projects compatible with UUID schema', () => {
    const compatible = filterCompatibleProjects(uuidSchema, mockUserFiles);
    const names = compatible.map((p) => p.name);
    expect(names).toContain('uuid-project');
    expect(names).toContain('any-project');
    expect(names).not.toContain('integer-project');
  });

  it('should filter projects compatible with integer schema', () => {
    const compatible = filterCompatibleProjects(integerSchema, mockUserFiles);
    const names = compatible.map((p) => p.name);
    expect(names).toContain('integer-project');
    expect(names).toContain('any-project');
    expect(names).not.toContain('uuid-project');
  });
});
