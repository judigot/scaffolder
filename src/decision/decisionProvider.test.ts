import { describe, expect, it } from 'vitest';
import {
  DECISION_MIN_CONFIDENCE,
  DecisionProviderError,
  createFakeDecisionProvider,
  createJevDecisionProvider,
} from './decisionProvider.ts';

describe('Jev decision provider', () => {
  it('preserves deterministic recommendations for a valid confident choice', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.resolve({
          choice: 'migration',
          confidence: 0.92,
        }),
    });

    const result = await provider.decide({
      input: 'The generated PostgreSQL database is missing a unique index.',
      failure: 'migration parity failed',
    });

    expect(result).toEqual({
      status: 'resolved',
      affectedSubsystem: 'migration',
      recommendedTests: ['migration parity tests'],
      recommendedAgent: 'golden-parity-engineer',
      needsFrontierModel: false,
      confidence: 0.92,
      provider: 'vercel-ai-gateway',
      evaluationMode: 'live',
      model: 'typesafe-ai/jev',
    });
  });

  it('returns needs_review below the uncertainty threshold', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.resolve({
          choice: 'migration',
          confidence: DECISION_MIN_CONFIDENCE - 0.01,
        }),
    });

    const result = await provider.decide({
      input: 'Something changed around persistence.',
    });

    expect(result).toEqual({
      status: 'needs_review',
      affectedSubsystem: 'unknown',
      recommendedTests: [],
      recommendedAgent: null,
      needsFrontierModel: false,
      confidence: DECISION_MIN_CONFIDENCE - 0.01,
      provider: 'vercel-ai-gateway',
      evaluationMode: 'live',
      model: 'typesafe-ai/jev',
      reviewReason: 'uncertain',
    });
  });

  it('accepts a valid choice at the uncertainty threshold', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.resolve({
          choice: 'openapi',
          confidence: DECISION_MIN_CONFIDENCE,
        }),
    });

    const result = await provider.decide({
      input: 'The OpenAPI contract is missing an endpoint.',
    });

    expect(result.status).toBe('resolved');
    expect(result.affectedSubsystem).toBe('openapi');
    expect(result.recommendedTests).toEqual(['OpenAPI parity tests']);
  });

  it('returns needs_review instead of project-builder for an invalid choice', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.resolve({
          choice: 'not-a-scaffolder-subsystem',
          confidence: 0.99,
        }),
    });

    const result = await provider.decide({
      input: 'Classify this request.',
    });

    expect(result).toMatchObject({
      status: 'needs_review',
      affectedSubsystem: 'unknown',
      recommendedTests: [],
      recommendedAgent: null,
      provider: 'vercel-ai-gateway',
      evaluationMode: 'live',
      reviewReason: 'invalid_response',
    });
  });

  it('returns needs_review when confidence is missing or invalid', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.resolve({
          choice: 'frontend',
          confidence: Number.NaN,
        }),
    });

    const result = await provider.decide({
      input: 'The generated frontend has a routing issue.',
    });

    expect(result).toMatchObject({
      status: 'needs_review',
      affectedSubsystem: 'unknown',
      recommendedAgent: null,
      reviewReason: 'invalid_response',
    });
  });

  it('surfaces a sanitized provider failure code', async () => {
    const provider = createJevDecisionProvider({
      evaluate: () =>
        Promise.reject(
          new Error('Authorization: Bearer secret-gateway-key upstream exploded'),
        ),
    });

    await expect(
      provider.decide({ input: 'Classify this request.' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DecisionProviderError>>({
        code: 'DECISION_PROVIDER_UNAVAILABLE',
        message: 'Jev evaluation provider is unavailable',
      }),
    );
  });

  it('bounds a slow provider with a timeout', async () => {
    const provider = createJevDecisionProvider({
      timeoutMs: 5,
      evaluate: (_request, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              reject(new Error('aborted by test'));
            },
            { once: true },
          );
        }),
    });

    await expect(
      provider.decide({ input: 'Classify this request.' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DecisionProviderError>>({
        code: 'DECISION_PROVIDER_TIMEOUT',
        message: 'Jev evaluation timed out',
      }),
    );
  });
});

describe('fake decision provider', () => {
  it('routes migration failures to migration parity tests', async () => {
    const result = await createFakeDecisionProvider().decide({
      input: 'The generated PostgreSQL database is missing a unique index.',
      failure: 'migration parity failed',
    });

    expect(result).toMatchObject({
      status: 'resolved',
      affectedSubsystem: 'migration',
      recommendedAgent: 'golden-parity-engineer',
      provider: 'fake',
      evaluationMode: 'fake',
      model: null,
    });
    expect(result.recommendedTests).toContain('migration parity tests');
  });

  it('keeps deterministic routing available when explicitly selected', async () => {
    const result = await createFakeDecisionProvider().decide({
      input: 'Add a state transition to schemaInfo.',
    });

    expect(result.affectedSubsystem).toBe('schema-info');
    expect(result.needsFrontierModel).toBe(true);
  });
});
