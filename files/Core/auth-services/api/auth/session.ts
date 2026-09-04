import {
  getBetterAuth,
  getSessionCookieName,
  SESSION_COOKIE_NAME,
} from './better-auth';
import type { User, Session } from './types';

interface ICookieAttributes {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  path?: string;
  maxAge?: number;
  domain?: string;
}

function serializeCookie(
  name: string,
  value: string,
  attributes: ICookieAttributes,
): string {
  const parts = [`${name}=${value}`, `Path=${attributes.path ?? '/'}`];

  if (attributes.maxAge !== undefined) {
    parts.push(`Max-Age=${String(attributes.maxAge)}`);
  }
  if (attributes.domain) {
    parts.push(`Domain=${attributes.domain}`);
  }
  if (attributes.httpOnly) {
    parts.push('HttpOnly');
  }
  if (attributes.secure) {
    parts.push('Secure');
  }
  if (attributes.sameSite) {
    parts.push(`SameSite=${attributes.sameSite}`);
  }

  return parts.join('; ');
}

function blankSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 0,
  });
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
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.userId !== 'string') {
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

/**
 * Better Auth `getSession` reads a signed cookie (`token.signature`).
 * Custom /auth/register stores the raw session token, so unwrap either form.
 */
function sessionTokenFromCookie(cookieValue: string): string {
  const separator = cookieValue.lastIndexOf('.');
  if (separator <= 0) {
    return cookieValue;
  }
  return cookieValue.slice(0, separator);
}

async function signSessionToken(
  token: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(token),
  );
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `${token}.${btoa(binary)}`;
}

function resolveAuthSecret(secret: unknown): string | null {
  if (typeof secret === 'string' && secret.length > 0) {
    return secret;
  }
  return null;
}

function sessionExpiresAt(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

export async function createSession(userId: string): Promise<{
  session: Session;
  sessionCookie: string;
}> {
  const auth = getBetterAuth();
  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createSession(userId);

  if (!created) {
    throw new Error('Failed to create Better Auth session');
  }

  const session = toSession(created);
  if (!session) {
    throw new Error('Better Auth returned an invalid session');
  }

  const cookie = ctx.authCookies.sessionToken;
  const token =
    'token' in created && typeof created.token === 'string'
      ? created.token
      : session.id;
  const secret = resolveAuthSecret(ctx.secret);
  const cookieValue = secret ? await signSessionToken(token, secret) : token;

  return {
    session,
    sessionCookie: serializeCookie(cookie.name, cookieValue, cookie.attributes),
  };
}

export async function validateSession(sessionId: string): Promise<{
  user: User | null;
  session: Session | null;
  sessionCookie?: string;
}> {
  const auth = getBetterAuth();
  const ctx = await auth.$context;
  const token = sessionTokenFromCookie(sessionId);

  try {
    const found = await ctx.internalAdapter.findSession(token);
    if (!found?.session || !found.user) {
      return {
        user: null,
        session: null,
        sessionCookie: blankSessionCookie(),
      };
    }

    const expiresAt = sessionExpiresAt(found.session.expiresAt);
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      await ctx.internalAdapter.deleteSession(token);
      return {
        user: null,
        session: null,
        sessionCookie: blankSessionCookie(),
      };
    }

    return {
      user: toUser(found.user),
      session: toSession(found.session),
    };
  } catch {
    return {
      user: null,
      session: null,
      sessionCookie: blankSessionCookie(),
    };
  }
}

export async function invalidateSession(sessionId: string): Promise<string> {
  const auth = getBetterAuth();
  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteSession(sessionTokenFromCookie(sessionId));
  return blankSessionCookie();
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const auth = getBetterAuth();
  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteSessions(userId);
}

export { getSessionCookieName, blankSessionCookie };
