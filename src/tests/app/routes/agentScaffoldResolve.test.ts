import { describe, expect, it } from 'vitest';
import { createAgentScaffoldResolveRouter } from '@/app/routes/agentScaffoldResolve.ts';

describe('POST /agent-scaffold/resolve', () => {
  it('returns deterministic recommendations when Jev is unavailable', async () => {
    const app = createAgentScaffoldResolveRouter({
      verifyAuthToken: async () => ({
        ok: true,
        status: 200,
        auth0UserId: 'test-user',
      }),
    });

    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input: 'Migration parity failed because an index is missing.',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      decision: { affectedSubsystem: string; provider: string };
    };
    expect(body).toMatchObject({
      ok: true,
      decision: { affectedSubsystem: 'migration', provider: 'fake' },
    });
  });

  it('rejects an empty decision request', async () => {
    const app = createAgentScaffoldResolveRouter({
      verifyAuthToken: async () => ({
        ok: true,
        status: 200,
        auth0UserId: 'test-user',
      }),
    });
    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: '' }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
