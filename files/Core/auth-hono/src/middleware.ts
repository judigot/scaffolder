import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  validateSession,
  getSessionCookieName,
  type User,
  type Session,
} from '../auth';

/**
 * Auth context added to Hono context by middleware
 */
export interface AuthContext {
  user: User | null;
  session: Session | null;
}

/**
 * Hono context type with auth
 */
export interface HonoAuthContext {
  Variables: {
    user: User | null;
    session: Session | null;
  };
}

/**
 * Session cookie middleware for Hono
 * Validates session and adds user/session to context
 */
export const sessionMiddleware = () => {
  return async (c: Context<HonoAuthContext>, next: Next) => {
    const cookieName = getSessionCookieName();
    const sessionId = getCookie(c, cookieName);

    if (!sessionId) {
      c.set('user', null);
      c.set('session', null);
      return next();
    }

    const { user, session, sessionCookie } = await validateSession(sessionId);

    // Refresh cookie if needed
    if (sessionCookie) {
      // Parse the Set-Cookie header to extract attributes
      const cookieAttrs = parseSetCookie(sessionCookie);
      setCookie(c, cookieName, session?.id ?? '', {
        path: cookieAttrs.path,
        httpOnly: cookieAttrs.httpOnly,
        secure: cookieAttrs.secure,
        sameSite: cookieAttrs.sameSite as 'Strict' | 'Lax' | 'None',
        maxAge: cookieAttrs.maxAge,
      });
    }

    c.set('user', user);
    c.set('session', session);

    return next();
  };
};

/**
 * Require authenticated user middleware
 * Returns 401 if no valid session
 */
export const requireAuth = () => {
  return async (c: Context<HonoAuthContext>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  };
};

/**
 * Require verified email middleware
 * Returns 403 if email not verified
 */
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

/**
 * Helper to get user from context (type-safe)
 */
export const getUser = (c: Context<HonoAuthContext>): User | null => {
  return c.get('user');
};

/**
 * Helper to get session from context (type-safe)
 */
export const getSession = (c: Context<HonoAuthContext>): Session | null => {
  return c.get('session');
};

/**
 * Helper to clear session cookie
 */
export const clearSessionCookie = (c: Context) => {
  const cookieName = getSessionCookieName();
  deleteCookie(c, cookieName, {
    path: '/',
  });
};

/**
 * Helper to set session cookie from serialized value
 */
export const setSessionCookie = (c: Context, serializedCookie: string) => {
  const cookieName = getSessionCookieName();
  const attrs = parseSetCookie(serializedCookie);

  setCookie(c, cookieName, attrs.value, {
    path: attrs.path,
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite as 'Strict' | 'Lax' | 'None',
    maxAge: attrs.maxAge,
  });
};

/**
 * Parse Set-Cookie header into attributes
 */
function parseSetCookie(cookie: string): {
  value: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  maxAge?: number;
} {
  const parts = cookie.split(';').map((p) => p.trim());
  const [nameValue] = parts;
  const value = nameValue.split('=')[1] ?? '';

  const attrs = {
    value,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
    maxAge: undefined as number | undefined,
  };

  for (const part of parts.slice(1)) {
    const [key, val] = part.split('=');
    const keyLower = key.toLowerCase();

    if (keyLower === 'path') attrs.path = val;
    if (keyLower === 'httponly') attrs.httpOnly = true;
    if (keyLower === 'secure') attrs.secure = true;
    if (keyLower === 'samesite') attrs.sameSite = val;
    if (keyLower === 'max-age') attrs.maxAge = parseInt(val, 10);
  }

  return attrs;
}
