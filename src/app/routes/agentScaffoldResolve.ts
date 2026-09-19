import { Hono } from 'hono';
import { redactAgentToken } from '@/app/services/agentGitHubToken.ts';
import {
  createFakeDecisionProvider,
  createJevDecisionProvider,
} from '@/decision/decisionProvider.ts';
import { AgentScaffoldResolveRequestSchema } from '@/schemas/agentScaffoldResolve.ts';
import {
  verifyAgentScaffoldAuth,
  type IAgentScaffoldAuthResult,
} from '@/utils/verifyAgentScaffoldAuth.ts';

type IAuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<IAgentScaffoldAuthResult>;

export function createAgentScaffoldResolveRouter(dependencies: {
  verifyAuthToken?: IAuthVerifier;
  agentApiKey?: string | null;
} = {}): Hono {
  const verifyAuthToken =
    dependencies.verifyAuthToken ??
    ((authorizationHeader: string | undefined) =>
      verifyAgentScaffoldAuth(authorizationHeader, {
        agentApiKey: dependencies.agentApiKey,
      }));
  const app = new Hono();

  app.post('/', async (c) => {
    const authResult = await verifyAuthToken(c.req.header('authorization'));
    if (!authResult.ok) return c.json(authResult.body, authResult.status);

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
      const provider = process.env.TYPESAFE_API_KEY
        ? createJevDecisionProvider()
        : createFakeDecisionProvider();
      return c.json({ ok: true, decision: await provider.decide(parsed.data) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Decision failed';
      return c.json({ ok: false, error: redactAgentToken(message, undefined) }, 503);
    }
  });

  return app;
}

export default createAgentScaffoldResolveRouter();
