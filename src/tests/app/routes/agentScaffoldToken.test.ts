import { describe, expect, it, vi } from 'vitest';
import { createAgentScaffoldRouter } from '@/app/routes/agentScaffold.ts';
import { AgentScaffoldError } from '@/app/services/agentScaffoldService.ts';

const body = JSON.stringify({
  schemaInfo: 'users: id:n*',
  project: 'demo',
  target_repo: 'alice/app',
});
describe('agent-scaffold PAT header', () => {
  it('passes credentials separately and redacts nested error details', async () => {
    const scaffold = vi.fn(() => {
      throw new AgentScaffoldError('failed secret-pat', {
        status: 403,
        code: 'TEST',
        details: { nested: ['secret-pat'] },
      });
    });
    const app = createAgentScaffoldRouter({ agentApiKey: 'api-key', scaffold });
    const response = await app.request('/', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer api-key',
        'X-GitHub-Token': 'secret-pat',
      },
    });
    expect(response.status).toBe(403);
    expect(scaffold).toHaveBeenCalledWith(JSON.parse(body), {
      auth0UserId: 'scaffolder-agent',
      githubToken: 'secret-pat',
    });
    expect(await response.text()).not.toContain('secret-pat');
  });
  it('redacts unexpected SDK errors', async () => {
    const app = createAgentScaffoldRouter({
      agentApiKey: 'api-key',
      scaffold: () => {
        throw new Error('secret-pat failed');
      },
    });
    const response = await app.request('/', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer api-key',
        'X-GitHub-Token': 'secret-pat',
      },
    });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('secret-pat');
  });
  it('requires API authentication even with a GitHub PAT', async () => {
    const scaffold = vi.fn();
    const app = createAgentScaffoldRouter({
      agentApiKey: 'api-key',
      scaffold,
      verifyAuthToken: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
    });
    const response = await app.request('/', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json', 'X-GitHub-Token': 'pat' },
    });
    expect(response.status).toBe(401);
    expect(scaffold).not.toHaveBeenCalled();
  });
  it.each(['', 'two tokens'])(
    'rejects an invalid explicit token without falling back',
    async (token) => {
      const scaffold = vi.fn();
      const app = createAgentScaffoldRouter({
        agentApiKey: 'api-key',
        scaffold,
      });
      const response = await app.request('/', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer api-key',
          'X-GitHub-Token': token,
        },
      });
      expect(response.status).toBe(400);
      expect(scaffold).not.toHaveBeenCalled();
    },
  );
});
