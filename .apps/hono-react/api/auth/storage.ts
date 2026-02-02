import type { AuthTokens, User } from './types';

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export const tokenStorage = {
  getTokens: (): AuthTokens | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  setTokens: (tokens: AuthTokens): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },

  getAccessToken: (): string | null => {
    const tokens = tokenStorage.getTokens();
    return tokens?.accessToken ?? null;
  },
};

export const userStorage = {
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  setUser: (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
  },
};

export const clearAuthStorage = (): void => {
  tokenStorage.clearTokens();
  userStorage.clearUser();
};
