import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

export const DECISION_SUBSYSTEMS = [
  'schema-info',
  'project-builder',
  'core',
  'project',
  'golden-test',
  'auth',
  'migration',
  'openapi',
  'frontend',
  'agent-scaffold',
] as const;

export type DecisionSubsystem = (typeof DECISION_SUBSYSTEMS)[number];

export interface DecisionRequest {
  input: string;
  schemaInfoPresent?: boolean;
  failure?: string;
}

export interface DecisionResult {
  affectedSubsystem: DecisionSubsystem;
  recommendedTests: string[];
  recommendedAgent: 'project-builder' | 'project-generator' | 'golden-parity-engineer';
  needsFrontierModel: boolean;
  confidence?: number;
  provider: 'jev' | 'fake';
}

export interface DecisionProvider {
  decide(request: DecisionRequest): Promise<DecisionResult>;
}

const subsystemCriteria = Object.fromEntries(
  DECISION_SUBSYSTEMS.map((subsystem) => [subsystem, null]),
) as Record<DecisionSubsystem, null>;

const testsForSubsystem: Record<DecisionSubsystem, string[]> = {
  'schema-info': ['schemaInfo parser tests', 'application contract tests'],
  'project-builder': ['generator tests', 'golden generation tests'],
  core: ['golden generation tests', 'production readiness checks'],
  project: ['generator tests', 'frontend E2E tests'],
  'golden-test': ['golden generation tests', 'cross-framework runtime parity'],
  auth: ['auth parity tests', 'frontend auth flow tests'],
  migration: ['migration parity tests'],
  openapi: ['OpenAPI parity tests'],
  frontend: ['frontend E2E tests'],
  'agent-scaffold': ['agent-scaffold API tests'],
};

function recommendationFor(subsystem: DecisionSubsystem): Pick<
  DecisionResult,
  'recommendedAgent' | 'needsFrontierModel'
> {
  if (subsystem === 'schema-info') {
    return { recommendedAgent: 'project-generator', needsFrontierModel: true };
  }
  if (subsystem === 'golden-test' || subsystem === 'migration') {
    return { recommendedAgent: 'golden-parity-engineer', needsFrontierModel: false };
  }
  return { recommendedAgent: 'project-builder', needsFrontierModel: false };
}

export function createJevDecisionProvider(
  client: TypeSafeClient = new TypeSafeClient(),
): DecisionProvider {
  return {
    async decide(request) {
      const response = await client.systemOne({
        state: {
          request: request.input,
          schemaInfoPresent: request.schemaInfoPresent ?? false,
          failure: request.failure ?? null,
        },
        questions: {
          affectedSubsystem: choice(
            'Which Scaffolder subsystem is primarily affected?',
            subsystemCriteria,
          ),
        },
      });
      const answer = response.answers.affectedSubsystem;
      const subsystem = answer.choice as DecisionSubsystem;
      const recommendation = recommendationFor(subsystem);
      return {
        affectedSubsystem: subsystem,
        recommendedTests: testsForSubsystem[subsystem],
        ...recommendation,
        confidence: answer.confidence,
        provider: 'jev',
      };
    },
  };
}

export function createFakeDecisionProvider(): DecisionProvider {
  return {
    async decide(request) {
      const input = `${request.input} ${request.failure ?? ''}`.toLowerCase();
      const subsystem: DecisionSubsystem = input.includes('openapi')
        ? 'openapi'
        : input.includes('migration') || input.includes('database')
          ? 'migration'
          : input.includes('schema')
            ? 'schema-info'
            : input.includes('auth')
              ? 'auth'
              : 'project-builder';
      return {
        affectedSubsystem: subsystem,
        recommendedTests: testsForSubsystem[subsystem],
        ...recommendationFor(subsystem),
        provider: 'fake',
      };
    },
  };
}

