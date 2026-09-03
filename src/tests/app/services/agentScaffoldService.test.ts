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

function createUserFiles(
  schemaFilter: string[] = [],
  projectName = 'hono-react',
): IStructure {
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
          name: projectName,
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
        project_url:
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
        updateExisting: false,
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

  it('targets an existing branch for update instead of failing', async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/judigot/bookingwars/pull/2',
        prNumber: 2,
        branch: 'scaffolder/hono-react-ab12',
        commitSha: 'second-commit',
        filesCreated: 1,
        baseBranch: 'main',
        updated: true,
      }),
    );

    const result = await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        branch: 'scaffolder/hono-react-ab12',
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
      },
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'scaffolder/hono-react-ab12',
        updateExisting: true,
      }),
    );
    expect(result.prNumber).toBe(2);
    expect(result.updated).toBe(true);
  });

  it('forwards prNumber and prUrl to the same target repo', async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/judigot/bookingwars/pull/2',
        prNumber: 2,
        branch: 'scaffolder/hono-react-ab12',
        commitSha: 'second-commit',
        filesCreated: 1,
        baseBranch: 'main',
        updated: true,
      }),
    );

    await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        prUrl: 'https://github.com/judigot/bookingwars/pull/2',
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
      },
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        prNumber: 2,
        updateExisting: true,
      }),
    );
  });

  it('rejects a prUrl that is not on target_repo', async () => {
    const publish = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
          prUrl: 'https://github.com/other/repo/pull/2',
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
          publish,
        },
      ),
    ).rejects.toMatchObject({ code: 'PR_REPO_MISMATCH', status: 400 });

    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects empty schemaInfo even when targeting an existing PR', async () => {
    const publish = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: [],
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
          prNumber: 2,
        },
        {
          loadUserFiles: () => createUserFiles(),
          buildProject: () =>
            Promise.resolve({
              structure: [],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
            }),
          publish,
        },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_SCHEMA', status: 400 });

    expect(publish).not.toHaveBeenCalled();
  });

  it('fetches files from project_url even for the example judigot repo', async () => {
    const loadRemoteUserFiles = vi.fn(() =>
      Promise.resolve(createUserFiles([], 'ORM Schema - Knex')),
    );
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/judigot/bookingwars/pull/2',
        prNumber: 2,
        branch: 'scaffolder/ORM-Schema-Knex-ab12',
        commitSha: 'commit-sha',
        filesCreated: 1,
        baseBranch: 'main',
        updated: true,
      }),
    );

    const result = await scaffoldToPullRequest(
      {
        target_repo: 'https://github.com/judigot/bookingwars',
        draft: true,
        prNumber: 2,
        project_url:
          'https://github.com/judigot/scaffolder-files/tree/main/Projects/ORM%20Schema%20-%20Knex',
        schemaInfo: validSchemaInfo,
      },
      {
        loadRemoteUserFiles,
        buildProject: (_projectYamlPath, _userFiles, _schemaInfo, formData) => {
          expect(formData.projectName).toBe('ORM Schema - Knex');
          expect(formData.publicRepoURL).toBe(
            'https://github.com/judigot/scaffolder-files',
          );
          return Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          });
        },
        publish,
        randomId: () => 'ab12',
      },
    );

    expect(loadRemoteUserFiles).toHaveBeenCalledWith({
      owner: 'judigot',
      repo: 'scaffolder-files',
      ref: 'main',
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        prNumber: 2,
        updateExisting: true,
      }),
    );
    expect(result.projectName).toBe('ORM Schema - Knex');
    expect(result.updated).toBe(true);
  });

  it('fetches a developer-owned scaffolder-files repository from the project URL', async () => {
    const loadRemoteUserFiles = vi.fn(() =>
      Promise.resolve(createUserFiles([], 'hono-react')),
    );
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

    await scaffoldToPullRequest(
      {
        project_url:
          'https://github.com/alice/my-scaffolder-files/tree/main/Projects/hono-react',
        target_repo: 'https://github.com/judigot/bookingwars',
        schemaInfo: validSchemaInfo,
      },
      {
        loadRemoteUserFiles,
        buildProject: (_projectYamlPath, _userFiles, _schemaInfo, formData) => {
          expect(formData.publicRepoURL).toBe(
            'https://github.com/alice/my-scaffolder-files',
          );
          return Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          });
        },
        publish,
        randomId: () => 'ab12',
      },
    );

    expect(loadRemoteUserFiles).toHaveBeenCalledWith({
      owner: 'alice',
      repo: 'my-scaffolder-files',
      ref: 'main',
    });
  });

  it('does not fetch a remote files repo for a legacy project name', async () => {
    const loadRemoteUserFiles = vi.fn(() =>
      Promise.resolve(createUserFiles()),
    );
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

    await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      },
      {
        loadUserFiles: () => createUserFiles(),
        loadRemoteUserFiles,
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

    expect(loadRemoteUserFiles).not.toHaveBeenCalled();
  });

  it('rejects a failed fetch of a developer-owned files repo', async () => {
    const publish = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          project_url:
            'https://github.com/alice/my-scaffolder-files/tree/main/Projects/hono-react',
          target_repo: 'judigot/bookingwars',
          schemaInfo: validSchemaInfo,
        },
        {
          loadRemoteUserFiles: () =>
            Promise.reject(new Error('zip download failed')),
          publish,
        },
      ),
    ).rejects.toMatchObject({
      code: 'FILES_REPO_FETCH_FAILED',
      status: 400,
    });

    expect(publish).not.toHaveBeenCalled();
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
