import type { Context, Next } from 'hono';
import { getBetterAuth } from '../better-auth';
import type { User, Session } from '../types';

export interface AuthContext {
  user: User | null;
  session: Session | null;
}

export interface HonoAuthContext {
  Variables: {
    user: User | null;
    session: Session | null;
  };
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

function toSession(value: unknown): Session | null {
  if (!isRecord(value) || typeof value.userId !== 'string') {
    return null;
  }

  const sessionId =
    typeof value.token === 'string'
      ? value.token
      : typeof value.id === 'string'
        ? value.id
        : null;
  if (!sessionId) {
    return null;
  }

  return {
    id: sessionId,
    userId: value.userId,
    expiresAt: value.expiresAt instanceof Date ? value.expiresAt : new Date(),
  };
}

export const sessionMiddleware = () => {
  return async (c: Context<HonoAuthContext>, next: Next) => {
    const auth = getBetterAuth();
    const result = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    c.set('user', result ? toUser(result.user) : null);
    c.set('session', result ? toSession(result.session) : null);

    return next();
  };
};

export const requireAuth = () => {
  return async (c: Context<HonoAuthContext>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  };
};

export const requireVerifiedEmail = () => {
  return async (c: Context<HonoAuthContext>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!user.emailVerified) {
      return c.json({ error: 'Email not verified' }, 403);
    }

    return next();
  };
};

export const getUser = (c: Context<HonoAuthContext>): User | null => {
  return c.get('user');
};

export const getSession = (c: Context<HonoAuthContext>): Session | null => {
  return c.get('session');
};
