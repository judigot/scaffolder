import { describe, expect, it, vi } from 'vitest';
import { scaffoldToPullRequest } from '@/app/services/agentScaffoldService.ts';
import { GitHubDraftPullRequestError } from '@/app/services/githubDraftPullRequestService.ts';
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

const PINNED_TEMPLATE_SHA = '0123456789abcdef0123456789abcdef01234567';
const PINNED_TEMPLATE_URL = `https://github.com/judigot/template-monorepo/tree/${PINNED_TEMPLATE_SHA}`;

function createUserFiles(
  schemaFilter: string[] = [],
  projectName = 'hono-react',
  structureYaml?: string,
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
              content:
                structureYaml ??
                `${filterYaml}readme:\n  CREATE_FILE(README.md):\n`,
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

  it('returns LEFTOVER_PLACEHOLDER instead of FORMAT_ERROR when markers remain', async () => {
    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
        },
        {
          loadUserFiles: () => createUserFiles(),
          buildProject: () =>
            Promise.resolve({
              structure: [
                {
                  type: 'file',
                  name: 'auth.ts',
                  content: 'col: <@@>userPasswordColumnCamelCase</@@>',
                },
              ],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
              hasErrors: true,
              messages: [
                {
                  id: 'leftover-1',
                  code: 'LEFTOVER_PLACEHOLDER',
                  title: 'Generated files still contain template markers',
                  severity: 'error',
                  details: ['auth.ts: <@@>userPasswordColumnCamelCase</@@>'],
                  timestamp: '2026-09-03T00:00:00.000Z',
                  dismissible: false,
                },
              ],
            }),
          publish: () => {
            throw new Error('should not publish leftover output');
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'LEFTOVER_PLACEHOLDER',
      status: 400,
    });
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

  it('uses bundled files for the official scaffolder-files URL', async () => {
    const loadRemoteUserFiles = vi.fn(() =>
      Promise.resolve(createUserFiles([], 'ORM Schema - Knex')),
    );
    const loadUserFiles = vi.fn(() => createUserFiles([], 'ORM Schema - Knex'));
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
        loadUserFiles,
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

    expect(loadRemoteUserFiles).not.toHaveBeenCalled();
    expect(loadUserFiles).toHaveBeenCalled();
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
    const loadRemoteUserFiles = vi.fn(() => Promise.resolve(createUserFiles()));
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

  it('rejects an unpinned template_repo before building', async () => {
    const buildProject = vi.fn();
    const publish = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
          template_repo:
            'https://github.com/judigot/template-monorepo/tree/main',
        },
        {
          loadUserFiles: () => createUserFiles(),
          buildProject,
          publish,
        },
      ),
    ).rejects.toMatchObject({
      code: 'TEMPLATE_REPO_UNPINNED',
      status: 400,
    });

    expect(buildProject).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('creates an org repo then publishes when create_repo is true', async () => {
    const createRepo = vi.fn(() =>
      Promise.resolve({
        created: true,
        repoUrl: 'https://github.com/acme/new-app',
      }),
    );
    const publish = vi.fn(() =>
      Promise.resolve({
        prUrl: 'https://github.com/acme/new-app/pull/1',
        prNumber: 1,
        branch: 'scaffolder/hono-react-ab12',
        commitSha: 'commit-sha',
        filesCreated: 1,
        baseBranch: 'main',
      }),
    );

    const result = await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'acme/new-app',
        create_repo: true,
      },
      {
        auth0UserId: 'scaffolder-agent',
        loadUserFiles: () => createUserFiles(),
        buildProject: () =>
          Promise.resolve({
            structure: [{ type: 'file', name: 'README.md', content: '# app' }],
            filesUsingUserEnv: [],
            filesFailedToFormat: [],
          }),
        createRepo,
        publish,
        randomId: () => 'ab12',
      },
    );

    expect(createRepo).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'new-app',
      auth0UserId: 'scaffolder-agent',
    });
    expect(result.repoCreated).toBe(true);
    expect(result.prUrl).toBe('https://github.com/acme/new-app/pull/1');
  });

  it('does not create a repo for an invalid schema', async () => {
    const createRepo = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: [],
          project: 'hono-react',
          target_repo: 'acme/new-app',
          create_repo: true,
        },
        {
          loadUserFiles: () => createUserFiles(),
          createRepo,
          buildProject: () => {
            throw new Error('should not generate');
          },
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_SCHEMA', status: 400 });

    expect(createRepo).not.toHaveBeenCalled();
  });

  it('does not create a repo when the project is missing', async () => {
    const createRepo = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'missing-project',
          target_repo: 'acme/new-app',
          create_repo: true,
        },
        {
          loadUserFiles: () => createUserFiles(),
          createRepo,
          buildProject: () => {
            throw new Error('should not generate');
          },
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND', status: 400 });

    expect(createRepo).not.toHaveBeenCalled();
  });

  it('does not create a repo when generation fails', async () => {
    const createRepo = vi.fn();

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'acme/new-app',
          create_repo: true,
        },
        {
          loadUserFiles: () => createUserFiles(),
          createRepo,
          buildProject: () =>
            Promise.resolve({
              structure: [],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
              hasErrors: true,
              messages: [
                {
                  id: 'build-1',
                  code: 'FORMAT_ERROR',
                  title: 'Files failed to format',
                  severity: 'error',
                  timestamp: '2026-09-05T00:00:00.000Z',
                  dismissible: false,
                },
              ],
            }),
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'BUILD_FAILED', status: 400 });

    expect(createRepo).not.toHaveBeenCalled();
  });

  it('returns the created repo URL when publish fails after create', async () => {
    const createRepo = vi.fn(() =>
      Promise.resolve({
        created: true,
        repoUrl: 'https://github.com/acme/new-app',
      }),
    );

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'acme/new-app',
          create_repo: true,
        },
        {
          loadUserFiles: () => createUserFiles(),
          createRepo,
          buildProject: () =>
            Promise.resolve({
              structure: [
                { type: 'file', name: 'README.md', content: '# app' },
              ],
              filesUsingUserEnv: [],
              filesFailedToFormat: [],
            }),
          publish: () => {
            throw new GitHubDraftPullRequestError('draft PR failed', {
              status: 500,
              code: 'PR_CREATE_FAILED',
            });
          },
          randomId: () => 'ab12',
        },
      ),
    ).rejects.toMatchObject({
      code: 'PR_CREATE_FAILED',
      details: {
        repoCreated: true,
        repoUrl: 'https://github.com/acme/new-app',
      },
    });

    expect(createRepo).toHaveBeenCalledTimes(1);
  });

  it('fetches a remote recipe $BASE when template_repo is omitted', async () => {
    const starter: IStructure = [
      { type: 'file', name: 'starter.txt', content: 'from-recipe' },
    ];
    const loadTemplateFiles = vi.fn(() => Promise.resolve(starter));
    const buildProject = vi.fn(() =>
      Promise.resolve({
        structure: [
          { type: 'file' as const, name: 'README.md', content: '# app' },
        ],
        filesUsingUserEnv: [],
        filesFailedToFormat: [],
      }),
    );

    await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      },
      {
        loadUserFiles: () =>
          createUserFiles(
            [],
            'hono-react',
            `$BASE: ${PINNED_TEMPLATE_URL}\nreadme:\n  CREATE_FILE(README.md):\n`,
          ),
        loadTemplateFiles,
        buildProject,
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

    expect(loadTemplateFiles).toHaveBeenCalledWith(PINNED_TEMPLATE_URL);
    expect(buildProject).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({ remoteBaseLayer: starter }),
    );
  });

  it('uses template_repo instead of the recipe remote $BASE', async () => {
    const overrideUrl = `https://github.com/judigot/template-monorepo/commit/${PINNED_TEMPLATE_SHA}`;
    const overrideLayer: IStructure = [
      { type: 'file', name: 'override.txt', content: 'from-override' },
    ];
    const loadTemplateFiles = vi.fn(() => Promise.resolve(overrideLayer));
    const buildProject = vi.fn(() =>
      Promise.resolve({
        structure: [
          { type: 'file' as const, name: 'README.md', content: '# app' },
        ],
        filesUsingUserEnv: [],
        filesFailedToFormat: [],
      }),
    );

    await scaffoldToPullRequest(
      {
        schemaInfo: validSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        template_repo: overrideUrl,
      },
      {
        loadUserFiles: () =>
          createUserFiles(
            [],
            'hono-react',
            `$BASE: ${PINNED_TEMPLATE_URL}\nreadme:\n  CREATE_FILE(README.md):\n`,
          ),
        loadTemplateFiles,
        buildProject,
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

    expect(loadTemplateFiles).toHaveBeenCalledWith(overrideUrl);
    expect(loadTemplateFiles).toHaveBeenCalledTimes(1);
    expect(buildProject).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.objectContaining({
        remoteBaseLayer: overrideLayer,
        templateRepoOverride: overrideUrl,
      }),
    );
  });

  it('reports TEMPLATE_API_CONFLICT from the real builder', async () => {
    const remoteHono: IStructure = [
      {
        type: 'folder',
        name: 'apps',
        children: [
          {
            type: 'folder',
            name: 'api',
            children: [
              {
                type: 'file',
                name: 'package.json',
                content: '{"dependencies":{"hono":"^4.0.0"}}',
              },
              {
                type: 'file',
                name: 'index.ts',
                content: 'import { Hono } from "hono";\n',
              },
            ],
          },
        ],
      },
    ];

    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'nestjs-api',
            children: [{ type: 'file', name: 'main.ts', content: 'nest' }],
          },
        ],
      },
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
                content:
                  '$USE_CORE:\n  - /Core/nestjs-api\nreadme:\n  CREATE_FILE(README.md):\n',
              },
            ],
          },
        ],
      },
    ];

    await expect(
      scaffoldToPullRequest(
        {
          schemaInfo: validSchemaInfo,
          project: 'hono-react',
          target_repo: 'judigot/bookingwars',
          template_repo: PINNED_TEMPLATE_URL,
        },
        {
          loadUserFiles: () => userFiles,
          loadTemplateFiles: () => Promise.resolve(remoteHono),
          publish: () => {
            throw new Error('should not publish');
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'TEMPLATE_API_CONFLICT',
      status: 400,
    });
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
