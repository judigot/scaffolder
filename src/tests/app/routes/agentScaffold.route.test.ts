import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAgentScaffoldRouter } from '@/app/routes/agentScaffold.ts';
import { scaffoldToPullRequest } from '@/app/services/agentScaffoldService.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import {
  honoReactAgentSchemaInfo,
  honoReactSchemaFilter,
} from '@/tests/helpers/honoReactAgentSchema.ts';

const successSchema = z.object({
  ok: z.literal(true),
  prUrl: z.string(),
  prNumber: z.number(),
  branch: z.string(),
});

const errorSchema = z.object({
  error: z.string(),
});

describe('agent scaffold API', () => {
  it('POST / accepts an agent API key without Auth0', async () => {
    const app = createAgentScaffoldRouter({
      agentApiKey: 'agent-secret',
      scaffold: () =>
        Promise.resolve({
          prUrl: 'https://github.com/judigot/bookingwars/pull/7',
          prNumber: 7,
          branch: 'scaffolder/hono-react-ab12',
          commitSha: 'commit-sha',
          filesCreated: 1,
          baseBranch: 'main',
          projectName: 'hono-react',
          targetRepo: 'judigot/bookingwars',
          tables: ['users'],
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer agent-secret',
      },
      body: JSON.stringify({
        schemaInfo: [
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
        ],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(201);
    expect(successSchema.safeParse(payload).success).toBe(true);
  });

  it('POST / requires auth when targeting an existing pull request', async () => {
    const app = createAgentScaffoldRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schemaInfo: [
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
        ],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        prNumber: 2,
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(401);
    expect(errorSchema.safeParse(payload).success).toBe(true);
  });

  it('POST / requires auth', async () => {
    const app = createAgentScaffoldRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schemaInfo: [],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(401);
    expect(errorSchema.safeParse(payload).success).toBe(true);
  });

  it('POST / rejects an invalid body', async () => {
    const app = createAgentScaffoldRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'user_1',
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project: 'hono-react',
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(400);
    expect(errorSchema.safeParse(payload).success).toBe(true);
  });

  it('POST / returns 201 with a draft PR payload', async () => {
    const app = createAgentScaffoldRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'user_1',
        }),
      scaffold: () =>
        Promise.resolve({
          prUrl: 'https://github.com/judigot/bookingwars/pull/7',
          prNumber: 7,
          branch: 'scaffolder/hono-react-ab12',
          commitSha: 'commit-sha',
          filesCreated: 1,
          baseBranch: 'main',
          projectName: 'hono-react',
          targetRepo: 'judigot/bookingwars',
          tables: ['users'],
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schemaInfo: [
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
        ],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(201);
    expect(successSchema.safeParse(payload).success).toBe(true);
  });

  it('POST / rejects empty schemaInfo with INVALID_SCHEMA', async () => {
    const app = createAgentScaffoldRouter({
      agentApiKey: 'agent-secret',
      scaffold: (request) =>
        scaffoldToPullRequest(request, {
          loadUserFiles: () => [],
          buildProject: () => {
            throw new Error('should not build');
          },
          publish: () => {
            throw new Error('should not publish');
          },
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer agent-secret',
      },
      body: JSON.stringify({
        schemaInfo: [],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        prNumber: 2,
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      code: 'INVALID_SCHEMA',
    });
  });

  it('POST / returns 200 when an existing pull request is updated', async () => {
    const app = createAgentScaffoldRouter({
      agentApiKey: 'agent-secret',
      scaffold: () =>
        Promise.resolve({
          prUrl: 'https://github.com/judigot/bookingwars/pull/2',
          prNumber: 2,
          branch: 'scaffolder/hono-react-ab12',
          commitSha: 'second-commit',
          filesCreated: 1,
          baseBranch: 'main',
          projectName: 'hono-react',
          targetRepo: 'judigot/bookingwars',
          tables: ['users'],
          updated: true,
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer agent-secret',
      },
      body: JSON.stringify({
        schemaInfo: [
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
        ],
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
        prNumber: 2,
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(200);
    expect(successSchema.safeParse(payload).success).toBe(true);
    expect(payload).toMatchObject({
      ok: true,
      prNumber: 2,
      updated: true,
    });
  });

  it('POST / accepts a hono-react uuid schema at the validator and filter layer', async () => {
    const successWithTablesSchema = successSchema.extend({
      tables: z.array(z.string()),
    });

    const createUserFiles = (schemaFilter: string[]): IStructure => [
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
                content: `$SCHEMA_FILTER:\n${schemaFilter.map((filter) => `  - '${filter}'`).join('\n')}\nreadme:\n  CREATE_FILE(README.md):\n`,
              },
            ],
          },
        ],
      },
    ];

    const app = createAgentScaffoldRouter({
      agentApiKey: 'agent-secret',
      scaffold: (request) =>
        scaffoldToPullRequest(request, {
          loadUserFiles: () => createUserFiles(honoReactSchemaFilter),
          buildProject: () =>
            Promise.resolve({
              structure: [
                { type: 'file', name: 'README.md', content: '# app' },
              ],
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
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer agent-secret',
      },
      body: JSON.stringify({
        schemaInfo: honoReactAgentSchemaInfo,
        project: 'hono-react',
        target_repo: 'judigot/bookingwars',
      }),
    });

    const payload: unknown = await response.json();
    expect(response.status).toBe(201);
    expect(successWithTablesSchema.safeParse(payload).success).toBe(true);
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'tables' in payload &&
      Array.isArray(payload.tables)
    ) {
      expect(payload.tables).toEqual(['user', 'session']);
    }
  });
});
