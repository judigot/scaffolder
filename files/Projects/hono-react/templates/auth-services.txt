import type { User, LoginCredentials, RegisterData } from '@/types';

const API_URL = '/api/auth';

// Token storage
export const tokenStorage = {
  getTokens: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    return accessToken ? { accessToken, refreshToken } : null;
  },
  setTokens: (tokens: { accessToken: string; refreshToken?: string }) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// User storage
export const userStorage = {
  getUser: (): User | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  clearUser: () => {
    localStorage.removeItem('user');
  },
};

// Clear all auth storage
export function clearAuthStorage() {
  tokenStorage.clearTokens();
  userStorage.clearUser();
}

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  register: async (data: RegisterData) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  logout: async () => {
    const tokens = tokenStorage.getTokens();
    if (tokens?.accessToken) {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const tokens = tokenStorage.getTokens();
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${tokens?.accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  },
};
