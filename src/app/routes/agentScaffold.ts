import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import {
  AgentScaffoldError,
  scaffoldToPullRequest,
  type IAgentScaffoldResult,
} from '@/app/services/agentScaffoldService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

interface IAuthVerifyFailure {
  ok: false;
  status: 401 | 500;
  body: unknown;
  auth0UserId?: undefined;
}

interface IAuthVerifySuccess {
  ok: true;
  status: 200;
  body?: undefined;
  auth0UserId: string;
}

type IAuthVerifyResult = IAuthVerifyFailure | IAuthVerifySuccess;

type IAuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<IAuthVerifyResult>;

interface ICreateAgentScaffoldRouterDependencies {
  verifyAuthToken?: IAuthVerifier;
  scaffold?: (
    request: ReturnType<typeof AgentScaffoldRequestSchema.parse>,
  ) => Promise<IAgentScaffoldResult>;
}

export function createAgentScaffoldRouter(
  dependencies: ICreateAgentScaffoldRouterDependencies = {},
): Hono {
  const verifyAuthToken =
    dependencies.verifyAuthToken ?? verifyAuth0TokenFromAuthHeader;
  const scaffold = dependencies.scaffold ?? scaffoldToPullRequest;

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
      const result = await scaffold(parsed.data);
      return c.json({ ok: true, ...result }, 201);
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
