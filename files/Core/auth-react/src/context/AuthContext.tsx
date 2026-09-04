import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createAuthClient } from 'better-auth/react';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthContextValue,
} from '../types';

const BASE_PATH = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
});

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toUser(value: unknown): User | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== 'string' || typeof value.email !== 'string') {
    return null;
  }

  const usernameValue = value.username ?? value.name;
  const username =
    typeof usernameValue === 'string' || usernameValue === null
      ? usernameValue
      : null;

  return {
    id: value.id,
    email: value.email,
    username,
    emailVerified: value.emailVerified === true,
    createdAt: value.createdAt instanceof Date ? value.createdAt : new Date(),
    updatedAt: value.updatedAt instanceof Date ? value.updatedAt : new Date(),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await authClient.getSession();
        const currentUser = toUser(data?.user);
        if (currentUser) {
          setUser(currentUser);
        }
      } catch {
        // Session check failed, user is not authenticated
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) {
        throw new Error(getErrorMessage(error, 'Login failed'));
      }
      const loggedInUser = toUser(data?.user);
      if (!loggedInUser) {
        throw new Error('Login failed');
      }
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.username ?? data.email,
      });
      if (error) {
        throw new Error(getErrorMessage(error, 'Registration failed'));
      }
      const newUser = toUser(result?.user);
      if (!newUser) {
        throw new Error('Registration failed');
      }
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore logout API errors
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
