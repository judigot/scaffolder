import { createGateway } from '@ai-sdk/gateway';
import { Hono } from 'hono';
import {
  DecisionProviderError,
  type DecisionProviderMode,
  type IDecisionProvider,
  JEV_GATEWAY_MODEL,
  createFakeDecisionProvider,
  createJevDecisionProvider,
} from '@/decision/decisionProvider.ts';
import {\n  AgentScaffoldResolveRequestSchema,\n  AgentScaffoldResolveResponseSchema,\n} from '@/schemas/agentScaffoldResolve.ts';
import {
  verifyAgentScaffoldAuth,
  type IAgentScaffoldAuthResult,
} from '@/utils/verifyAgentScaffoldAuth.ts';

type IAuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<IAgentScaffoldAuthResult>;

interface IAgentScaffoldResolveDependencies {
  verifyAuthToken?: IAuthVerifier;
  agentApiKey?: string | null;
  aiGatewayApiKey?: string | null;
  decisionProviderMode?: DecisionProviderMode;
  createGatewayProvider?: (apiKey: string) => IDecisionProvider;
}

function getOptionalSecret(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function getDecisionProviderMode(
  override: DecisionProviderMode | undefined,
): DecisionProviderMode {
  if (override !== undefined) {
    return override;
  }
  return process.env.SCAFFOLDER_DECISION_PROVIDER === 'fake'
    ? 'fake'
    : 'gateway';
}

function createGatewayDecisionProvider(apiKey: string): IDecisionProvider {
  const gateway = createGateway({ apiKey });
  return createJevDecisionProvider({
    model: gateway.evaluationModel(JEV_GATEWAY_MODEL),
  });
}

export function createAgentScaffoldResolveRouter(
  dependencies: IAgentScaffoldResolveDependencies = {},
): Hono {
  const verifyAuthToken =
    dependencies.verifyAuthToken ??
    ((authorizationHeader: string | undefined) =>
      verifyAgentScaffoldAuth(authorizationHeader, {
        agentApiKey: dependencies.agentApiKey,
      }));
  const app = new Hono();

  app.post('/', async (c) => {
    const authResult = await verifyAuthToken(c.req.header('authorization'));
    if (!authResult.ok) {
      return c.json(authResult.body, authResult.status);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const parsed = AgentScaffoldResolveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400,
      );
    }

    try {
      const mode = getDecisionProviderMode(dependencies.decisionProviderMode);
      let provider: IDecisionProvider;

      if (mode === 'fake') {
        if (process.env.NODE_ENV === 'production') {
          throw new DecisionProviderError(
            'FAKE_DECISION_PROVIDER_NOT_ALLOWED',
            'Fake decision evaluation is not allowed in production',
          );
        }
        provider = createFakeDecisionProvider();
      } else {
        const apiKey = getOptionalSecret(
          dependencies.aiGatewayApiKey ?? process.env.AI_GATEWAY_API_KEY,
        );
        if (apiKey === null) {
          throw new DecisionProviderError(
            'AI_GATEWAY_NOT_CONFIGURED',
            'AI Gateway is not configured',
          );
        }
        provider =
          dependencies.createGatewayProvider?.(apiKey) ??
          createGatewayDecisionProvider(apiKey);
      }

      const response = {\n        ok: true as const,\n        decision: await provider.decide(parsed.data),\n      };\n      return c.json(AgentScaffoldResolveResponseSchema.parse(response));
    } catch (error: unknown) {
      const providerError =
        error instanceof DecisionProviderError
          ? error
          : new DecisionProviderError(
              'DECISION_PROVIDER_UNAVAILABLE',
              'Jev evaluation provider is unavailable',
            );
      const response = AgentScaffoldResolveResponseSchema.parse({
        ok: false,
        error: {
          code: providerError.code,
          message: providerError.message,
        },
      });
      return c.json(response, 503);
    }
  });

  return app;
}

export default createAgentScaffoldResolveRouter();
