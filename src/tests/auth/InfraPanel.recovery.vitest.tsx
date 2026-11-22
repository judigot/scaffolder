import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InfraPanel from '@/components/AI/InfraPanel.tsx';
import { createAppQueryClient } from '@/lib/api/queryClient.ts';
import { ApiError } from '@/lib/auth/authErrors.ts';
import {
  installRotatingTokenProvider,
  jsonResponse,
  resetAuthState,
  setNavigatorOnline,
  requestUrl,
} from './testUtils.ts';

const metadata = {
  infra: {
    sshPublicKey: 'ssh-ed25519 AAAA test',
    sshPrivateKey: '',
    awsAccessKeyId: 'AKIA_TEST',
    awsSecretAccessKey: 'secret',
    tfcToken: 'tfc-token',
    tfcOrg: 'test-org',
  },
};

interface IHookState {
  decryptedMetadata: Record<string, unknown> | null;
  isLoading: boolean;
  error: Error | null;
  retry: ReturnType<typeof vi.fn>;
  isRetrying: boolean;
}

const hookState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@/hooks/useUser.ts', () => ({
  useUser: () => ({
    user: { sub: 'auth0|alice', nickname: 'alice' },
    userMetadata: metadata,
    isAuthenticated: true,
    accessToken: null,
  }),
}));

vi.mock('@/hooks/useDecryptedUserMetadata.ts', () => ({
  useDecryptedUserMetadata: () => hookState.current,
}));

vi.mock('@/components/Terminal/index.ts', () => ({
  TerminalMode: () => null,
}));

const setHookState = (partial: Partial<IHookState>): IHookState => {
  const state: IHookState = {
    decryptedMetadata: metadata,
    isLoading: false,
    error: null,
    retry: vi.fn(() => Promise.resolve()),
    isRetrying: false,
    ...partial,
  };
  hookState.current = state;
  return state;
};

const fetchMock = vi.fn<typeof fetch>();
const callsTo = (suffix: string) =>
  fetchMock.mock.calls.filter(([input]) => requestUrl(input).endsWith(suffix));

const renderPanel = () =>
  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <InfraPanel />
    </QueryClientProvider>,
  );

describe('InfraPanel recovery states', () => {
  beforeEach(() => {
    resetAuthState();
    setNavigatorOnline(true);
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAuthState();
  });

  it('shows an actionable error instead of an endless skeleton when metadata fails', () => {
    installRotatingTokenProvider();
    const state = setHookState({
      decryptedMetadata: null,
      error: new ApiError({ kind: 'server' }),
    });

    const { container } = renderPanel();

    expect(
      screen.getByText('Could not load your infrastructure settings'),
    ).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable error when Terraform workspaces fail to load', async () => {
    installRotatingTokenProvider();
    setHookState({});
    fetchMock.mockImplementation((input) =>
      Promise.resolve(
        requestUrl(input).endsWith('/terraform/workspaces')
          ? jsonResponse(500, { error: 'Failed to fetch workspaces' })
          : jsonResponse(200, {}),
      ),
    );

    const { container } = renderPanel();

    expect(
      await screen.findByText(
        'Could not load Terraform workspaces',
        {},
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeNull();
    // Bounded retries (initial + 2), not an endless loop.
    expect(callsTo('/terraform/workspaces').length).toBeLessThanOrEqual(3);

    fetchMock.mockImplementation((input) =>
      Promise.resolve(
        requestUrl(input).endsWith('/terraform/workspaces')
          ? jsonResponse(200, {
              success: true,
              workspaces: [{ id: 'ws-1', name: 'prod' }],
            })
          : jsonResponse(200, { success: true, enableEc2: false, outputs: {} }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('prod')).toBeInTheDocument();
  }, 15_000);

  it('does not show skeletons or send requests when the session has expired', async () => {
    const { failWith } = installRotatingTokenProvider();
    failWith('login_required');
    setHookState({});

    const { container } = renderPanel();

    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a Terraform run exactly once and never replays it after a 401', async () => {
    installRotatingTokenProvider();
    setHookState({});
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith('/terraform/workspaces')) {
        return Promise.resolve(
          jsonResponse(200, {
            success: true,
            workspaces: [{ id: 'ws-1', name: 'prod' }],
          }),
        );
      }
      if (url.endsWith('/terraform/status')) {
        return Promise.resolve(
          jsonResponse(200, { success: true, enableEc2: false, outputs: {} }),
        );
      }
      if (url.endsWith('/terraform/run')) {
        return Promise.resolve(jsonResponse(401, { error: 'Invalid token' }));
      }
      return Promise.resolve(jsonResponse(200, {}));
    });

    renderPanel();
    const toggle = await screen.findByRole('switch', {
      name: 'Toggle EC2 instance',
    });
    await waitFor(() => {
      expect(toggle).not.toBeDisabled();
    });

    fireEvent.click(toggle);

    expect(await screen.findByText(/Nothing was changed/)).toBeInTheDocument();
    expect(callsTo('/terraform/run')).toHaveLength(1);
    // Optimistic toggle is rolled back.
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
