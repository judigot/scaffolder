import type { Experimental_EvaluationModel } from 'ai';
import { experimental_evaluate } from 'ai';

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

export const DECISION_MIN_CONFIDENCE = 0.75;
export const DECISION_TIMEOUT_MS = 5_000;
export const JEV_GATEWAY_MODEL = 'typesafe-ai/jev';

export type DecisionSubsystem = (typeof DECISION_SUBSYSTEMS)[number];
export type DecisionProviderMode = 'gateway' | 'fake';

type DecisionAgent =
  | 'project-builder'
  | 'project-generator'
  | 'golden-parity-engineer';

export interface IDecisionRequest {
  input: string;
  schemaInfoPresent?: boolean;
  failure?: string;
}

export interface IDecisionResult {
  status: 'resolved' | 'needs_review';
  affectedSubsystem: DecisionSubsystem | 'unknown';
  recommendedTests: string[];
  recommendedAgent: DecisionAgent | null;
  needsFrontierModel: boolean;
  confidence?: number;
  provider: 'vercel-ai-gateway' | 'fake';
  evaluationMode: 'live' | 'fake';
  model: typeof JEV_GATEWAY_MODEL | null;
  reviewReason?: 'uncertain' | 'invalid_response';
}

export interface IDecisionProvider {
  decide(request: IDecisionRequest): Promise<IDecisionResult>;
}

export type DecisionProviderErrorCode =
  | 'AI_GATEWAY_NOT_CONFIGURED'
  | 'DECISION_PROVIDER_TIMEOUT'
  | 'DECISION_PROVIDER_UNAVAILABLE'
  | 'FAKE_DECISION_PROVIDER_NOT_ALLOWED';

export class DecisionProviderError extends Error {
  constructor(
    readonly code: DecisionProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DecisionProviderError';
  }
}

interface IJevEvaluation {
  choice: unknown;
  confidence: unknown;
}

interface IJevDecisionProviderOptions {
  model?: Experimental_EvaluationModel;
  timeoutMs?: number;
  evaluate?: (
    request: IDecisionRequest,
    signal: AbortSignal,
  ) => Promise<IJevEvaluation>;
}

const subsystemCriteria: Record<DecisionSubsystem, string | null> = {
  'schema-info': 'schemaInfo parsing, normalization, or contract input',
  'project-builder': 'project generation orchestration or generator implementation',
  core: 'shared Core template or reusable scaffold foundation',
  project: 'project-specific generated application behavior',
  'golden-test': 'golden application fixtures or cross-framework parity coverage',
  auth: 'authentication or authorization parity',
  migration: 'database migration or schema parity',
  openapi: 'OpenAPI contract or API surface parity',
  frontend: 'shared frontend behavior or frontend end-to-end parity',
  'agent-scaffold': 'agent-scaffold API, publication, or resolve endpoint behavior',
};

const decisionSubsystemSet = new Set<string>(DECISION_SUBSYSTEMS);

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

function isDecisionSubsystem(value: unknown): value is DecisionSubsystem {
  return typeof value === 'string' && decisionSubsystemSet.has(value);
}

function isConfidence(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function getTypeSafeConfidence(providerMetadata: unknown): unknown {
  if (
    typeof providerMetadata !== 'object' ||
    providerMetadata === null ||
    !('typesafe' in providerMetadata)
  ) {
    return undefined;
  }
  const typesafe = providerMetadata.typesafe;
  if (
    typeof typesafe !== 'object' ||
    typesafe === null ||
    !('confidence' in typesafe)
  ) {
    return undefined;
  }
  const confidence = typesafe.confidence;
  if (
    typeof confidence !== 'object' ||
    confidence === null ||
    !('affectedSubsystem' in confidence)
  ) {
    return undefined;
  }
  return confidence.affectedSubsystem;
}

function recommendationFor(subsystem: DecisionSubsystem): Pick<
  IDecisionResult,
  'recommendedAgent' | 'needsFrontierModel'
> {
  if (subsystem === 'schema-info') {
    return { recommendedAgent: 'project-generator', needsFrontierModel: true };
  }
  if (subsystem === 'golden-test' || subsystem === 'migration') {
    return {
      recommendedAgent: 'golden-parity-engineer',
      needsFrontierModel: false,
    };
  }
  return { recommendedAgent: 'project-builder', needsFrontierModel: false };
}

function needsReview(
  reason: NonNullable<IDecisionResult['reviewReason']>,
  confidence?: number,
): IDecisionResult {
  return {
    status: 'needs_review',
    affectedSubsystem: 'unknown',
    recommendedTests: [],
    recommendedAgent: null,
    needsFrontierModel: false,
    ...(confidence === undefined ? {} : { confidence }),
    provider: 'vercel-ai-gateway',
    evaluationMode: 'live',
    model: JEV_GATEWAY_MODEL,
    reviewReason: reason,
  };
}

async function evaluateWithModel(
  model: Experimental_EvaluationModel,
  request: IDecisionRequest,
  signal: AbortSignal,
): Promise<IJevEvaluation> {
  const result = await experimental_evaluate({
    model,
    state: {
      request: request.input,
      schemaInfoPresent: request.schemaInfoPresent ?? false,
      failure: request.failure ?? null,
    },
    questions: {
      affectedSubsystem: {
        type: 'choice',
        instructions:
          'Which Scaffolder subsystem is primarily affected by this bounded development request or failure?',
        criteria: subsystemCriteria,
      },
    },
    maxRetries: 0,
    abortSignal: signal,
  });
  const answer = result.answers.affectedSubsystem;
  return {
    choice: answer.choice,
    confidence: getTypeSafeConfidence(result.providerMetadata),
  };
}

export function createJevDecisionProvider(
  options: IJevDecisionProviderOptions,
): IDecisionProvider {
  if (options.evaluate === undefined && options.model === undefined) {
    throw new DecisionProviderError(
      'AI_GATEWAY_NOT_CONFIGURED',
      'AI Gateway is not configured',
    );
  }

  const timeoutMs = options.timeoutMs ?? DECISION_TIMEOUT_MS;
  const evaluate =
    options.evaluate ??
    ((request: IDecisionRequest, signal: AbortSignal) =>
      evaluateWithModel(
        options.model as Experimental_EvaluationModel,
        request,
        signal,
      ));

  return {
    async decide(request) {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        const evaluation = await evaluate(request, controller.signal);
        if (
          !isDecisionSubsystem(evaluation.choice) ||
          !isConfidence(evaluation.confidence)
        ) {
          return needsReview('invalid_response');
        }
        if (evaluation.confidence < DECISION_MIN_CONFIDENCE) {
          return needsReview('uncertain', evaluation.confidence);
        }

        const subsystem = evaluation.choice;
        return {
          status: 'resolved',
          affectedSubsystem: subsystem,
          recommendedTests: testsForSubsystem[subsystem],
          ...recommendationFor(subsystem),
          confidence: evaluation.confidence,
          provider: 'vercel-ai-gateway',
          evaluationMode: 'live',
          model: JEV_GATEWAY_MODEL,
        };
      } catch {
        if (timedOut) {
          throw new DecisionProviderError(
            'DECISION_PROVIDER_TIMEOUT',
            'Jev evaluation timed out',
          );
        }
        throw new DecisionProviderError(
          'DECISION_PROVIDER_UNAVAILABLE',
          'Jev evaluation provider is unavailable',
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createFakeDecisionProvider(): IDecisionProvider {
  return {
    decide(request) {
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
      return Promise.resolve({
        status: 'resolved',
        affectedSubsystem: subsystem,
        recommendedTests: testsForSubsystem[subsystem],
        ...recommendationFor(subsystem),
        provider: 'fake',
        evaluationMode: 'fake',
        model: null,
      });
    },
  };
}
