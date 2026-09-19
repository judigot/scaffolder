import { describe, expect, it } from 'vitest';
import { createFakeDecisionProvider } from './decisionProvider.ts';

describe('decision provider fallback', () => {
  it('routes migration failures to migration parity tests', async () => {
    const result = await createFakeDecisionProvider().decide({
      input: 'The generated PostgreSQL database is missing a unique index.',
      failure: 'migration parity failed',
    });

    expect(result).toMatchObject({
      affectedSubsystem: 'migration',
      recommendedAgent: 'golden-parity-engineer',
      provider: 'fake',
    });
    expect(result.recommendedTests).toContain('migration parity tests');
  });

  it('keeps deterministic routing available without Jev', async () => {
    const result = await createFakeDecisionProvider().decide({
      input: 'Add a state transition to schemaInfo.',
    });

    expect(result.affectedSubsystem).toBe('schema-info');
    expect(result.needsFrontierModel).toBe(true);
  });
});

