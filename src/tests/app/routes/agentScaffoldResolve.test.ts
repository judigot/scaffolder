import { afterEach, describe, expect, it } from 'vitest';
import { createAgentScaffoldResolveRouter } from '@/app/routes/agentScaffoldResolve.ts';
import type {
  IDecisionProvider,
  IDecisionResult,
} from '@/decision/decisionProvider.ts';
import { AgentScaffoldResolveResponseSchema } from '@/schemas/agentScaffoldResolve.ts';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

function authenticatedDependencies(
  overrides: Parameters<typeof createAgentScaffoldResolveRouter>[0] = {},
) {
  return {
    verifyAuthToken: () =>
      Promise.resolve({
        ok: true as const,
        status: 200 as const,
        auth0UserId: 'test-user',
      }),
    ...overrides,
  };
}

function createLiveDecision(
  overrides: Partial<IDecisionResult> = {},
): IDecisionResult {
  return {
    status: 'resolved',
    affectedSubsystem: 'migration',
    recommendedTests: ['migration parity tests'],
    recommendedAgent: 'golden-parity-engineer',
    needsFrontierModel: false,
    confidence: 0.91,
    provider: 'vercel-ai-gateway',
    evaluationMode: 'live',
    model: 'typesafe-ai/jev',
    ...overrides,
  };
}

describe('POST /agent-scaffold/resolve', () => {
  it('uses the Vercel AI Gateway provider when configured', async () => {
    let usedGateway = false;
    const liveProvider: IDecisionProvider = {
      decide: () => {
        usedGateway = true;
        return Promise.resolve(createLiveDecision());
      },
    };
    const app = createAgentScaffoldResolveRouter(
      authenticatedDependencies({
        aiGatewayApiKey: 'gateway-test-key',
        createGatewayProvider: (apiKey) => {
          expect(apiKey).toBe('gateway-test-key');
          return liveProvider;
        },
      }),
    );

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
    expect(usedGateway).toBe(true);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      decision: createLiveDecision(),
    });
  });

  it('returns needs_review without credentials instead of faking live success', async () => {
    process.env.NODE_ENV = 'production';
    const app = createAgentScaffoldResolveRouter(
      authenticatedDependencies({
        aiGatewayApiKey: null,
      }),
    );

    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input: 'Migration parity failed because an index is missing.',
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: 'AI_GATEWAY_NOT_CONFIGURED',
        message: 'AI Gateway is not configured',
      },
    });
  });

  it('uses the fake provider only through explicit development configuration', async () => {
    process.env.NODE_ENV = 'development';
    const app = createAgentScaffoldResolveRouter(
      authenticatedDependencies({
        aiGatewayApiKey: null,
        decisionProviderMode: 'fake',
      }),
    );

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
    const body = AgentScaffoldResolveResponseSchema.parse(await response.json());
    expect(body).toMatchObject({
      ok: true,
      decision: {
        status: 'resolved',
        affectedSubsystem: 'migration',
        provider: 'fake',
        evaluationMode: 'fake',
      },
    });
  });

  it('rejects fake mode in production', async () => {
    process.env.NODE_ENV = 'production';
    const app = createAgentScaffoldResolveRouter(
      authenticatedDependencies({
        aiGatewayApiKey: null,
        decisionProviderMode: 'fake',
      }),
    );

    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: 'Classify this request.' }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: 'FAKE_DECISION_PROVIDER_NOT_ALLOWED',
        message: 'Fake decision evaluation is not allowed in production',
      },
    });
  });

  it('returns sanitized provider failures', async () => {
    const failingProvider: IDecisionProvider = {
      decide: () =>
        Promise.reject(
          new Error('Authorization: Bearer super-secret provider diagnostics'),
        ),
    };
    const app = createAgentScaffoldResolveRouter(
      authenticatedDependencies({
        aiGatewayApiKey: 'gateway-test-key',
        createGatewayProvider: () => failingProvider,
      }),
    );

    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: 'Classify this request.' }),
      }),
    );

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('DECISION_PROVIDER_UNAVAILABLE');
    expect(body).not.toContain('super-secret');
    expect(body).not.toContain('Authorization');
  });

  it('preserves endpoint authentication before evaluating', async () => {
    let providerCreated = false;
    const app = createAgentScaffoldResolveRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Unauthorized' },
        }),
      aiGatewayApiKey: 'gateway-test-key',
      createGatewayProvider: () => {
        providerCreated = true;
        return {
          decide: () => Promise.resolve(createLiveDecision()),
        };
      },
    });

    const response = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: 'Classify this request.' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(providerCreated).toBe(false);
  });

  it('rejects an empty decision request', async () => {
    const app = createAgentScaffoldResolveRouter(authenticatedDependencies());
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
