import { describe, expect, it, vi } from 'vitest';
import { scaffoldToPullRequest } from '@/app/services/agentScaffoldService.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import {
  honoReactAgentSchemaInfo,
  honoReactCompactSchema,
  honoReactSchemaFilter,
} from '@/tests/helpers/honoReactAgentSchema.ts';

const validSchemaInfo = [
  {
    tableName: 'users',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'number',
        is_nullable: 'NO',
        primary_key: true,
      },
    ],
  },
];

function createUserFiles(schemaFilter: string[] = []): IStructure {
  const filterYaml =
    schemaFilter.length === 0
      ? ''
      : `$SCHEMA_FILTER:\n${schemaFilter.map((filter) => `  - '${filter}'`).join('\n')}\n`;

  return [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'hono-react',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: `${filterYaml}readme:\n  CREATE_FILE(README.md):\n`,
            },
          ],
        },
      ],
    },
  ];
}

describe('scaffoldToPullRequest', () => {
  it('validates schemaInfo, generates files, and publishes a draft PR', async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/judigot/bookingwars/pull/7',
        prNumber: 7,
        branch: 'scaffolder/hono-react-ab12',
        commitSha: 'commit-sha',
        filesCreated: 1,
        baseBranch: 'main',
      }),
    );

    const result = await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project:
          'https://github.com/judigot/scaffolder-files/tree/main/Projects/hono-react',
        target_repo: 'https://github.com/judigot/bookingwars',
      },
      {
        loadUserFiles: () => createUserFiles(),
        buildProject: () =>
          Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          }),
        publish,
        randomId: () => 'ab12',
      },
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'judigot',
        repo: 'bookingwars',
        branch: 'scaffolder/hono-react-ab12',
        draft: true,
      }),
    );
    expect(result.prUrl).toBe('https://github.com/judigot/bookingwars/pull/7');
    expect(result.tables).toEqual(['users']);
  });

  it('rejects invalid schemaInfo before generating files', async () => {
    const buildProject = vi.fn();
    const publish = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: [],
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
        },
        {
          loadUserFiles: () => createUserFiles(),
          buildProject,
          publish,
        },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_SCHEMA', status: 400 });

    expect(buildProject).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('accepts a hono-react schema with uuid ids and session.userId', async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/judigot/bookingwars/pull/7',
        prNumber: 7,
        branch: 'scaffolder/hono-react-ab12',
        commitSha: 'commit-sha',
        filesCreated: 1,
        baseBranch: 'main',
      }),
    );

    const result = await scaffoldToPullRequest(
      {
        schemaInfo: honoReactAgentSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      },
      {
        loadUserFiles: () => createUserFiles(honoReactSchemaFilter),
        buildProject: () =>
          Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          }),
        publish,
        randomId: () => 'ab12',
      },
    );

    expect(result.tables).toEqual(['user', 'session']);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('accepts a compact hono-react schema with :u and camelCase userId', async () => {
    const result = await scaffoldToPullRequest(
      {
        schemaInfo: honoReactCompactSchema,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      },
      {
        loadUserFiles: () => createUserFiles(honoReactSchemaFilter),
        buildProject: () =>
          Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          }),
        publish: () =>
          Promise.resolve({
            prUrl: 'https://github.com/judigot/bookingwars/pull/7',
            prNumber: 7,
            branch: 'scaffolder/hono-react-ab12',
            commitSha: 'commit-sha',
            filesCreated: 1,
            baseBranch: 'main',
          }),
        randomId: () => 'ab12',
      },
    );

    expect(result.tables).toEqual(['user', 'session']);
  });

  it('rejects a schema that fails the project filter', async () => {
    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
        },
        {
          loadUserFiles: () => createUserFiles(['session']),
          buildProject: () =>
            Promise.resolve({
              structure: [],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
            }),
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'SCHEMA_FILTER_FAILED', status: 400 });
  });

  it('refuses an explicit main branch', async () => {
    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
          branch: 'main',
        },
        {
          loadUserFiles: () => createUserFiles(),
          buildProject: () =>
            Promise.resolve({
              structure: [
                { type: 'file', name: 'README.md', content: '# app' },
              ],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
            }),
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'PROTECTED_BRANCH', status: 400 });
  });
});
