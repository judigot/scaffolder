import type { IMockAuthConfig } from '@/test/mocks/auth/types.ts';
import type { TokenProvider } from '@/lib/auth/tokenManager.ts';

/**
 * Mock auth (window.__MOCK_AUTH__) is used by Playwright/unit tests to bypass
 * Auth0. It is read at call time so tests can change it mid-session.
 */
const hasMockAuth = (
  win: Window,
): win is Window & { __MOCK_AUTH__: IMockAuthConfig } =>
  '__MOCK_AUTH__' in win &&
  typeof win.__MOCK_AUTH__ === 'object' &&
  win.__MOCK_AUTH__ !== null;

export const getMockAuthConfig = (): IMockAuthConfig | null => {
  if (typeof window === 'undefined' || !hasMockAuth(window)) {
    return null;
  }
  return window.__MOCK_AUTH__.isAuthenticated === true
    ? window.__MOCK_AUTH__
    : null;
};

class MockAuth0Error extends Error {
  readonly error: string;

  constructor(code: string) {
    super(code);
    this.name = 'MockAuth0Error';
    this.error = code;
  }
}

/** Token provider that mirrors getAccessTokenSilently using mock config. */
export const mockTokenProvider: TokenProvider = () => {
  const config = getMockAuthConfig();
  if (config === null) {
    return Promise.reject(new MockAuth0Error('login_required'));
  }
  if (typeof config.tokenError === 'string' && config.tokenError !== '') {
    return Promise.reject(new MockAuth0Error(config.tokenError));
  }
  if (typeof config.accessToken !== 'string' || config.accessToken === '') {
    return Promise.reject(new MockAuth0Error('login_required'));
  }
  return Promise.resolve(config.accessToken);
};
