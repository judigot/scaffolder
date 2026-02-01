import { getLucia } from './lucia';
import type { User, Session } from './types';

export async function createSession(userId: string): Promise<{
  session: Session;
  sessionCookie: string;
}> {
  const lucia = getLucia();
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return {
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    },
    sessionCookie: sessionCookie.serialize(),
  };
}

export async function validateSession(sessionId: string): Promise<{
  user: User | null;
  session: Session | null;
  sessionCookie?: string;
}> {
  const lucia = getLucia();
  const result = await lucia.validateSession(sessionId);

  if (!result.session) {
    const blankCookie = lucia.createBlankSessionCookie();
    return {
      user: null,
      session: null,
      sessionCookie: blankCookie.serialize(),
    };
  }

  // Refresh cookie if session is fresh (extended)
  let sessionCookie: string | undefined;
  if (result.session.fresh) {
    const cookie = lucia.createSessionCookie(result.session.id);
    sessionCookie = cookie.serialize();
  }

  return {
    user: result.user as unknown as User,
    session: {
      id: result.session.id,
      userId: result.session.userId,
      expiresAt: result.session.expiresAt,
    },
    sessionCookie,
  };
}

export async function invalidateSession(sessionId: string): Promise<string> {
  const lucia = getLucia();
  await lucia.invalidateSession(sessionId);
  const blankCookie = lucia.createBlankSessionCookie();
  return blankCookie.serialize();
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const lucia = getLucia();
  await lucia.invalidateUserSessions(userId);
}

export function getSessionCookieName(): string {
  const lucia = getLucia();
  return lucia.sessionCookieName;
}
