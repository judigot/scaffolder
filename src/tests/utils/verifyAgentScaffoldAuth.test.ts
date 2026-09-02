import { describe, expect, it } from 'vitest';
import {
  extractBearerToken,
  secretsMatch,
  verifyAgentScaffoldAuth,
} from '@/utils/verifyAgentScaffoldAuth.ts';

describe('extractBearerToken', () => {
  it('reads a Bearer token', () => {
    expect(extractBearerToken('Bearer agent-secret')).toBe('agent-secret');
  });

  it('returns null when the header is missing', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });
});

describe('secretsMatch', () => {
  it('accepts equal secrets of different lengths from a naive compare', () => {
    expect(secretsMatch('short', 'short')).toBe(true);
    expect(secretsMatch('short', 'different-length-secret')).toBe(false);
  });
});

describe('verifyAgentScaffoldAuth', () => {
  it('accepts SCAFFOLDER_AGENT_API_KEY without Auth0', async () => {
    const result = await verifyAgentScaffoldAuth('Bearer agent-secret', {
      agentApiKey: 'agent-secret',
      verifyAuth0: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth0UserId).toBe('scaffolder-agent');
    }
  });

  it('does not treat a wrong agent key as authenticated', async () => {
    const result = await verifyAgentScaffoldAuth('Bearer wrong', {
      agentApiKey: 'agent-secret',
      verifyAuth0: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
    });

    expect(result.ok).toBe(false);
  });

  it('falls back to Auth0 when no agent key is configured', async () => {
    const result = await verifyAgentScaffoldAuth('Bearer user-jwt', {
      agentApiKey: null,
      verifyAuth0: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'auth0|user_1',
        }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth0UserId).toBe('auth0|user_1');
    }
  });
});
