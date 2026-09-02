import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAgentScaffoldRouter } from '@/app/routes/agentScaffold.ts';

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
});
