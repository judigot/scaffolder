import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { redactAgentToken } from '@/app/services/agentGitHubToken.ts';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import {
  AgentScaffoldError,
  scaffoldToArtifact,
  scaffoldToPullRequest,
  type IAgentScaffoldArtifactResult,
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
    context: { auth0UserId?: string; githubToken?: string },
  ) => Promise<IAgentScaffoldResult>;
  scaffoldArtifact?: (
    request: ReturnType<typeof AgentScaffoldRequestSchema.parse>,
    context: { auth0UserId?: string },
  ) => Promise<IAgentScaffoldArtifactResult>;
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

    const output = parsed.data.output ?? 'github_pr';
    const githubToken =
      output === 'github_pr' ? c.req.header('x-github-token') : undefined;
    if (
      githubToken !== undefined &&
      (githubToken.trim() === '' || /\s/.test(githubToken))
    ) {
      return c.json(
        {
          ok: false,
          code: 'INVALID_GITHUB_TOKEN',
          error:
            'X-GitHub-Token must contain a nonempty token without whitespace.',
        },
        400,
      );
    }

    try {
      if (output === 'zip' || output === 'sh') {
        const scaffoldArtifact =
          dependencies.scaffoldArtifact ?? scaffoldToArtifact;
        const artifact = await scaffoldArtifact(parsed.data, {
          auth0UserId: authResult.auth0UserId,
        });
        c.header('Content-Type', artifact.contentType);
        c.header(
          'Content-Disposition',
          `attachment; filename="${artifact.filename}"`,
        );
        c.header('Cache-Control', 'no-store');
        if (typeof artifact.body === 'string') {
          return c.body(artifact.body);
        }
        return c.body(Uint8Array.from(artifact.body).buffer);
      }

      const scaffold = dependencies.scaffold ?? scaffoldToPullRequest;
      const result = await scaffold(parsed.data, {
        auth0UserId: authResult.auth0UserId,
        githubToken,
      });
      const status = result.updated === true ? 200 : 201;
      return c.json({ ok: true, ...result }, status);
    } catch (error: unknown) {
      if (error instanceof AgentScaffoldError) {
        return c.json(
          {
            ok: false,
            error: redactAgentToken(error.message, githubToken),
            code: error.code,
            details: redactAgentToken(error.details, githubToken),
            installationUrl: error.installationUrl,
          },
          error.status,
        );
      }
      const message =
        error instanceof Error ? error.message : 'Failed to scaffold project';
      return c.json(
        { ok: false, error: redactAgentToken(message, githubToken) },
        500,
      );
    }
  });

  return app;
}

const router = createAgentScaffoldRouter();
export default router;
