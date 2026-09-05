import { describe, expect, it, vi } from 'vitest';
import {
  AgentCreateRepoError,
  createAgentTargetRepository,
} from '@/app/services/agentCreateRepoService.ts';
import { AGENT_AUTH_SUBJECT } from '@/utils/verifyAgentScaffoldAuth.ts';

describe('createAgentTargetRepository', () => {
  it('returns REPO_EXISTS and does not overwrite', async () => {
    const createRepository = vi.fn();

    await expect(
      createAgentTargetRepository(
        { owner: 'acme', repo: 'already-there' },
        { auth0UserId: AGENT_AUTH_SUBJECT },
        {
          repoExists: () => Promise.resolve(true),
          getOwnerType: () => Promise.resolve('Organization'),
          createRepository,
        },
      ),
    ).rejects.toMatchObject({
      code: 'REPO_EXISTS',
      status: 409,
    });

    expect(createRepository).not.toHaveBeenCalled();
  });

  it('rejects user-owned create when the agent-key caller has no stored token', async () => {
    const createRepository = vi.fn();

    await expect(
      createAgentTargetRepository(
        { owner: 'judigot', repo: 'new-app' },
        { auth0UserId: AGENT_AUTH_SUBJECT },
        {
          repoExists: () => Promise.resolve(false),
          getOwnerType: () => Promise.resolve('User'),
          getStoredUserToken: () => Promise.resolve(null),
          createRepository,
        },
      ),
    ).rejects.toMatchObject({
      code: 'USER_REPO_CREATE_UNSUPPORTED',
      status: 400,
    });

    expect(createRepository).not.toHaveBeenCalled();
  });

  it('creates an org repo via the GitHub App with private + auto_init', async () => {
    const createRepository = vi.fn(() =>
      Promise.resolve({
        success: true,
        message: 'created',
        repoUrl: 'https://github.com/acme/new-app',
      }),
    );
    const verifyAppWriteAccess = vi.fn(() => Promise.resolve());

    const result = await createAgentTargetRepository(
      { owner: 'acme', repo: 'new-app' },
      { auth0UserId: AGENT_AUTH_SUBJECT },
      {
        repoExists: () => Promise.resolve(false),
        getOwnerType: () => Promise.resolve('Organization'),
        createRepository,
        verifyAppWriteAccess,
      },
    );

    expect(createRepository).toHaveBeenCalledWith({
      owner: 'acme',
      repoName: 'new-app',
      isPrivate: true,
      autoInit: true,
      auth0UserId: AGENT_AUTH_SUBJECT,
      method: 'github_app',
    });
    expect(verifyAppWriteAccess).toHaveBeenCalledWith('acme', 'new-app');
    expect(result.created).toBe(true);
  });

  it('creates a user repo when a stored Auth0 GitHub token exists', async () => {
    const createRepository = vi.fn(() =>
      Promise.resolve({
        success: true,
        message: 'created',
        repoUrl: 'https://github.com/judigot/new-app',
      }),
    );

    await createAgentTargetRepository(
      { owner: 'judigot', repo: 'new-app' },
      { auth0UserId: 'auth0|user-1' },
      {
        repoExists: () => Promise.resolve(false),
        getOwnerType: () => Promise.resolve('User'),
        getStoredUserToken: () => Promise.resolve('stored-user-token'),
        createRepository,
        verifyAppWriteAccess: () => Promise.resolve(),
      },
    );

    expect(createRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'judigot',
        method: 'personal_token',
        autoInit: true,
        isPrivate: true,
      }),
    );
  });

  it('enriches App verification failures after a successful create', async () => {
    const createRepository = vi.fn(() =>
      Promise.resolve({
        success: true,
        message: 'created',
        repoUrl: 'https://github.com/acme/new-app',
      }),
    );
    const installationUrl =
      'https://github.com/apps/scaffolder/installations/new';

    await expect(
      createAgentTargetRepository(
        { owner: 'acme', repo: 'new-app' },
        { auth0UserId: AGENT_AUTH_SUBJECT },
        {
          repoExists: () => Promise.resolve(false),
          getOwnerType: () => Promise.resolve('Organization'),
          createRepository,
          verifyAppWriteAccess: () =>
            Promise.reject(
              new AgentCreateRepoError(
                'GitHub App cannot write to acme/new-app. Install the Scaffolder GitHub App on this repository.',
                {
                  status: 403,
                  code: 'GITHUB_APP_NOT_INSTALLED',
                  installationUrl,
                },
              ),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'GITHUB_APP_NOT_INSTALLED',
      status: 403,
      installationUrl,
      details: {
        repoCreated: true,
        repoUrl: 'https://github.com/acme/new-app',
        recovery:
          'The destination repository was created. Grant the Scaffolder GitHub App access, then retry with create_repo: false.',
      },
    });

    expect(createRepository).toHaveBeenCalledTimes(1);
  });

  it('maps GitHub already-exists errors to REPO_EXISTS', async () => {
    await expect(
      createAgentTargetRepository(
        { owner: 'acme', repo: 'race' },
        {},
        {
          repoExists: () => Promise.resolve(false),
          getOwnerType: () => Promise.resolve('Organization'),
          createRepository: () =>
            Promise.reject(new Error('Repository name already exists')),
        },
      ),
    ).rejects.toBeInstanceOf(AgentCreateRepoError);

    await expect(
      createAgentTargetRepository(
        { owner: 'acme', repo: 'race' },
        {},
        {
          repoExists: () => Promise.resolve(false),
          getOwnerType: () => Promise.resolve('Organization'),
          createRepository: () =>
            Promise.reject(new Error('Repository name already exists')),
        },
      ),
    ).rejects.toMatchObject({ code: 'REPO_EXISTS', status: 409 });
  });
});
