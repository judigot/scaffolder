import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSession, getSessionCookieName } from '../auth';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
}

// Cookie-based session auth middleware
export const authMiddleware = async (c: Context, next: Next) => {
  const cookieName = getSessionCookieName();
  const sessionId = getCookie(c, cookieName);

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { user, session } = await validateSession(sessionId);

  if (!user || !session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', user);
  c.set('session', session);
  await next();
};

export const getUser = (c: Context): AuthUser => {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not found in context - authMiddleware not applied?');
  }
  return user as AuthUser;
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const cookieName = getSessionCookieName();
  const sessionId = getCookie(c, cookieName);

  if (sessionId) {
    const { user, session } = await validateSession(sessionId);
    if (user && session) {
      c.set('user', user);
      c.set('session', session);
    }
  }

  await next();
};
