import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  createWorkspace,
  getWorkspaceByIdForOwner,
  retryWorkspaceBootstrap,
} from '@/app/services/workspaceService.ts';
import { WorkspaceProvisionRequestSchema } from '@/schemas/workspaces.ts';
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

interface ICreateRouterDependencies {
  verifyAuthToken?: IAuthVerifier;
}

export function createWorkspacesRouter(
  dependencies: ICreateRouterDependencies = {},
): Hono {
  const verifyAuthToken =
    dependencies.verifyAuthToken ?? verifyAuth0TokenFromAuthHeader;

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

    const parseResult = WorkspaceProvisionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400,
      );
    }

    const workspace = createWorkspace(authResult.auth0UserId, parseResult.data);
    return c.json({ id: workspace.id, status: workspace.status }, 201);
  });

  app.get('/:id', async (c) => {
    const authResult = await verifyAuthToken(c.req.header('authorization'));
    if (!authResult.ok) {
      return c.json(authResult.body, authResult.status);
    }

    const workspaceId = c.req.param('id');
    if (workspaceId.trim() === '') {
      return c.json({ error: 'workspace id is required' }, 400);
    }

    const workspace = getWorkspaceByIdForOwner(
      workspaceId,
      authResult.auth0UserId,
    );
    if (workspace === null) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    return c.json({ workspace }, 200);
  });

  app.post('/:id/retry-bootstrap', async (c) => {
    const authResult = await verifyAuthToken(c.req.header('authorization'));
    if (!authResult.ok) {
      return c.json(authResult.body, authResult.status);
    }

    const workspaceId = c.req.param('id');
    if (workspaceId.trim() === '') {
      return c.json({ error: 'workspace id is required' }, 400);
    }

    try {
      const workspace = retryWorkspaceBootstrap(
        workspaceId,
        authResult.auth0UserId,
      );
      return c.json({ id: workspace.id, status: workspace.status }, 200);
    } catch (error) {
      if (error instanceof Error && error.message === 'Workspace not found') {
        return c.json({ error: error.message }, 404);
      }

      const message =
        error instanceof Error ? error.message : 'Failed to retry bootstrap';
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

const workspacesRouter = createWorkspacesRouter();

export default workspacesRouter;
