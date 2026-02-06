import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createWorkspacesRouter } from '@/app/routes/workspaces.ts';
import {
  clearWorkspaceStore,
  createWorkspace,
  updateWorkspaceStatus,
} from '@/app/services/workspaceService.ts';

const createResponseSchema = z.object({
  id: z.string(),
  status: z.literal('queued'),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

describe('workspaces API contracts', () => {
  it('POST / creates a workspace and returns 201', async () => {
    clearWorkspaceStore();
    const app = createWorkspacesRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'user_1',
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspaceName: 'alice-dev',
        domain: 'alice-dev.example.com',
      }),
    });

    const payload: unknown = await response.json();
    const parsed = createResponseSchema.safeParse(payload);

    expect(response.status).toBe(201);
    expect(parsed.success).toBe(true);
  });

  it('POST / rejects invalid domain with 400', async () => {
    clearWorkspaceStore();
    const app = createWorkspacesRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'user_1',
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspaceName: 'alice-dev',
        domain: 'invalid-domain',
      }),
    });

    const payload: unknown = await response.json();
    const parsed = errorResponseSchema.safeParse(payload);

    expect(response.status).toBe(400);
    expect(parsed.success).toBe(true);
  });

  it('GET /:id returns 404 for non-owner access', async () => {
    clearWorkspaceStore();
    const workspace = createWorkspace('owner_user', {
      workspaceName: 'owner-dev',
      domain: 'owner-dev.example.com',
    });

    const app = createWorkspacesRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'other_user',
        }),
    });

    const response = await app.request(`http://localhost/${workspace.id}`, {
      method: 'GET',
    });

    const payload: unknown = await response.json();
    const parsed = errorResponseSchema.safeParse(payload);

    expect(response.status).toBe(404);
    expect(parsed.success).toBe(true);
  });

  it('POST /:id/retry-bootstrap returns 200 and infra_ready for failed workspace', async () => {
    clearWorkspaceStore();
    const workspace = createWorkspace('user_1', {
      workspaceName: 'alice-dev',
      domain: 'alice-dev.example.com',
    });
    updateWorkspaceStatus(workspace.id, 'infra_provisioning');
    updateWorkspaceStatus(workspace.id, 'failed', 'mock failure');

    const app = createWorkspacesRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          auth0UserId: 'user_1',
        }),
    });

    const response = await app.request(
      `http://localhost/${workspace.id}/retry-bootstrap`,
      {
        method: 'POST',
      },
    );

    const payload: unknown = await response.json();
    const parsed = z
      .object({ id: z.string(), status: z.literal('infra_ready') })
      .safeParse(payload);

    expect(response.status).toBe(200);
    expect(parsed.success).toBe(true);
  });

  it('returns 401 when token verification fails', async () => {
    clearWorkspaceStore();
    const app = createWorkspacesRouter({
      verifyAuthToken: () =>
        Promise.resolve({
          ok: false,
          status: 401,
          body: { error: 'Missing or invalid authorization header' },
        }),
    });

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspaceName: 'alice-dev',
        domain: 'alice-dev.example.com',
      }),
    });

    const payload: unknown = await response.json();
    const parsed = errorResponseSchema.safeParse(payload);

    expect(response.status).toBe(401);
    expect(parsed.success).toBe(true);
  });
});
