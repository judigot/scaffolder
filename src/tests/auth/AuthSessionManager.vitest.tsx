import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthSessionManager from '@/components/auth/AuthSessionManager.tsx';
import {
  createAppQueryClient,
  installAuthAwareFocusManager,
  installConnectivityTracking,
} from '@/lib/api/queryClient.ts';
import {
  consumeDraft,
  MAX_LOGIN_ATTEMPTS,
  registerDraftProvider,
} from '@/lib/auth/returnContext.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import {
  resetTokenManager,
  revalidateSession,
} from '@/lib/auth/tokenManager.ts';
import { MetadataProbe } from './MetadataProbe.tsx';
import {
  FakeAuth0Error,
  getAuthHeader,
  jsonResponse,
  resetAuthState,
} from './testUtils.ts';

interface IAuth0Mock {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { sub: string } | undefined;
  getAccessTokenSilently: ReturnType<typeof vi.fn>;
  loginWithRedirect: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

const auth0 = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => auth0.current,
}));

let tokenCounter = 0;
let tokenFailure: string | null = null;

const createAuth0Mock = (): IAuth0Mock => ({
  isAuthenticated: true,
  isLoading: false,
  user: { sub: 'auth0|alice' },
  getAccessTokenSilently: vi.fn(async () => {
    await Promise.resolve();
    if (tokenFailure !== null) {
      throw new FakeAuth0Error(tokenFailure);
    }
    tokenCounter += 1;
    return `token-${String(tokenCounter)}`;
  }),
  loginWithRedirect: vi.fn(() => Promise.resolve()),
  logout: vi.fn(() => Promise.resolve()),
});

const fetchMock = vi.fn<typeof fetch>();

const renderManager = (mock: IAuth0Mock) => {
  auth0.current = mock;
  const queryClient = createAppQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionManager>
        <MetadataProbe />
      </AuthSessionManager>
    </QueryClientProvider>,
  );
  return { queryClient, view };
};

const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('AuthSessionManager', () => {
  beforeEach(() => {
    resetAuthState();
    tokenCounter = 0;
    tokenFailure = null;
    fetchMock.mockReset();
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(200, { ok: true })),
    );
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/scaffolder/?tab=infra');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setVisibility('visible');
    resetAuthState();
    window.history.replaceState({}, '', '/');
  });

  it('resumes silently on a returning idle tab with a valid session', async () => {
    installAuthAwareFocusManager(revalidateSession);
    const mock = createAuth0Mock();
    renderManager(mock);
    await waitFor(() => {
      expect(screen.getByTestId('probe-status').textContent).toBe('success');
    });
    const callsBefore = fetchMock.mock.calls.length;

    act(() => {
      setVisibility('hidden');
    });
    act(() => {
      setVisibility('visible');
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(getAuthHeader(lastCall[1])).toMatch(/^Bearer token-\d+$/);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('shows the session-expired dialog when silent renewal requires login', async () => {
    tokenFailure = 'login_required';
    const mock = createAuth0Mock();
    renderManager(mock);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Session expired');
    await waitFor(() => {
      expect(screen.getByTestId('probe-status').textContent).toBe('error');
    });
    // No protected request reached the API.
    expect(fetchMock).not.toHaveBeenCalled();

    // Escape must not dismiss the blocking dialog.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('signs in again with the preserved page and drafts', async () => {
    tokenFailure = 'missing_refresh_token';
    const mock = createAuth0Mock();
    const unregister = registerDraftProvider('infra:new-workspace', () => ({
      newWorkspace: 'staging',
    }));
    renderManager(mock);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign in again' }),
    );

    expect(mock.loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: '/scaffolder/?tab=infra' },
    });
    unregister();
    expect(consumeDraft('infra:new-workspace')).toEqual({
      newWorkspace: 'staging',
    });
  });

  it('starts a single redirect even if Sign in again is tapped repeatedly', async () => {
    tokenFailure = 'login_required';
    const mock = createAuth0Mock();
    renderManager(mock);

    const signIn = await screen.findByRole('button', { name: 'Sign in again' });
    fireEvent.click(signIn);
    fireEvent.click(screen.getByRole('button', { name: 'Redirecting…' }));
    expect(mock.loginWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('counts each redirect toward the loop budget across page loads', async () => {
    tokenFailure = 'login_required';
    for (let load = 0; load < MAX_LOGIN_ATTEMPTS; load += 1) {
      resetTokenManager();
      useSessionStore.getState().reset();
      const mock = createAuth0Mock();
      const { view } = renderManager(mock);
      fireEvent.click(
        await screen.findByRole('button', { name: 'Sign in again' }),
      );
      expect(mock.loginWithRedirect).toHaveBeenCalledTimes(1);
      view.unmount();
    }

    resetTokenManager();
    useSessionStore.getState().reset();
    const mock = createAuth0Mock();
    renderManager(mock);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign in again' }),
    );
    expect(mock.loginWithRedirect).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/could not restore your session/i),
    ).toBeInTheDocument();
  });

  it('shows loop-prevention guidance once the redirect budget is exhausted', async () => {
    window.sessionStorage.setItem(
      'scaffolder:auth:login-attempts',
      JSON.stringify(
        Array.from({ length: MAX_LOGIN_ATTEMPTS }, () => Date.now()),
      ),
    );
    tokenFailure = 'login_required';
    const mock = createAuth0Mock();
    renderManager(mock);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign in again' }),
    );

    expect(mock.loginWithRedirect).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/could not restore your session/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('clears auth-dependent caches when the identity changes', async () => {
    const mock = createAuth0Mock();
    const { queryClient, view } = renderManager(mock);
    await waitFor(() => {
      expect(screen.getByTestId('probe-status').textContent).toBe('success');
    });
    queryClient.setQueryData(['terraform-workspaces', 'secret'], {
      workspaces: [],
    });

    auth0.current = { ...mock, user: { sub: 'auth0|bob' } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <AuthSessionManager>
          <div />
        </AuthSessionManager>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        queryClient.getQueryData(['terraform-workspaces', 'secret']),
      ).toBeUndefined();
    });
  });

  it('shows a subtle indicator for offline and online transitions', async () => {
    const stop = installConnectivityTracking();
    renderManager(createAuth0Mock());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      await screen.findByTestId('connectivity-indicator'),
    ).toHaveTextContent("You're offline");

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByText('Back online')).toBeInTheDocument();
    expect(useSessionStore.getState().isOnline).toBe(true);
    stop();
  });
});
