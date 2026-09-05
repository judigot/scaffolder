import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import {
  AgentScaffoldError,
  scaffoldToPullRequest,
  type IAgentScaffoldResult,
} from '@/app/services/agentScaffoldService.ts';
import {
  verifyAgentScaffoldAuth,
  type IAgentScaffoldAuthResult,
} from '@/utils/verifyAgentScaffoldAuth.ts';

type IAuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<IAgentScaffoldAuthResult>;

interface ICreateAgentScaffoldRouterDependencies {
  verifyAuthToken?: IAuthVerifier;
  agentApiKey?: string | null;
  scaffold?: (
    request: ReturnType<typeof AgentScaffoldRequestSchema.parse>,
  ) => Promise<IAgentScaffoldResult>;
}

export function createAgentScaffoldRouter(
  dependencies: ICreateAgentScaffoldRouterDependencies = {},
): Hono {
  const verifyAuthToken =
    dependencies.verifyAuthToken ??
    ((authorizationHeader: string | undefined) =>
      verifyAgentScaffoldAuth(authorizationHeader, {
        agentApiKey: dependencies.agentApiKey,
      }));
  const app = new Hono();
  app.use('*', cors());

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

    const parsed = AgentScaffoldRequestSchema.safeParse(body);
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
      const result = await (dependencies.scaffold === undefined
        ? scaffoldToPullRequest(parsed.data, {
            auth0UserId: authResult.auth0UserId,
          })
        : dependencies.scaffold(parsed.data));
      const status = result.updated === true ? 200 : 201;
      return c.json({ ok: true, ...result }, status);
    } catch (error: unknown) {
      if (error instanceof AgentScaffoldError) {
        return c.json(
          {
            ok: false,
            error: error.message,
            code: error.code,
            details: error.details,
            installationUrl: error.installationUrl,
          },
          error.status,
        );
      }
      const message =
        error instanceof Error ? error.message : 'Failed to scaffold project';
      return c.json({ ok: false, error: message }, 500);
    }
  });

  return app;
}

const router = createAgentScaffoldRouter();
export default router;
