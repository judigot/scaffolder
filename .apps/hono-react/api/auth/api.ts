import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from './types';
import { tokenStorage } from './storage';

const API_BASE = '/api/auth';

async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.getAccessToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> =>
    authFetch('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data: RegisterData): Promise<AuthResponse> =>
    authFetch('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (): Promise<void> =>
    authFetch('/logout', { method: 'POST' }),

  getCurrentUser: (): Promise<User> =>
    authFetch('/me'),

  refreshToken: (): Promise<AuthResponse> =>
    authFetch('/refresh', { method: 'POST' }),
};
