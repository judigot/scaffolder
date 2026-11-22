/**
 * Preserves the user's working context across an interactive re-login and
 * guards against redirect loops.
 *
 * Navigation state (top-level tab, active repository/sprint/chat, scaffolder
 * project) is already persisted to localStorage by the Zustand stores and so
 * survives the Auth0 redirect. This module adds:
 * - the exact URL to return to (`appState.returnTo`),
 * - "safe" unsaved UI drafts registered by components (never secrets),
 * - a login-redirect attempt budget so a broken session can never cause an
 *   infinite redirect loop.
 */
import { recordAuthDiagnostic } from '@/lib/auth/authDiagnostics.ts';
import { isRecord } from '@/utils/typeGuards.ts';

const RETURN_CONTEXT_KEY = 'scaffolder:auth:return-context';
const LOGIN_ATTEMPTS_KEY = 'scaffolder:auth:login-attempts';
const CONTEXT_TTL_MS = 30 * 60 * 1000;
const LOGIN_ATTEMPT_WINDOW_MS = 2 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 3;

type DraftProvider = () => unknown;

const draftProviders = new Map<string, DraftProvider>();

interface IReturnContext {
  returnTo: string;
  savedAt: number;
  drafts: Record<string, unknown>;
}

const getStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

const readJson = (key: string): unknown => {
  const storage = getStorage();
  const raw = storage?.getItem(key) ?? null;
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    storage?.removeItem(key);
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    getStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode); context is best-effort.
  }
};

const AUTH_CALLBACK_PARAMS = ['code', 'state', 'error', 'error_description'];

/** Current location without Auth0 callback parameters. */
export const getCurrentReturnTo = (): string => {
  if (typeof window === 'undefined') {
    return '/';
  }
  const url = new URL(window.location.href);
  for (const param of AUTH_CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

/** Only allow same-origin relative paths as return targets. */
export const sanitizeReturnTo = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return null;
  }
  if (value.startsWith('//') || value.includes('\\')) {
    return null;
  }
  return value;
};

/**
 * Registers a component's safe, non-sensitive draft state so it can be
 * restored after re-authentication. Returns an unregister function.
 */
export const registerDraftProvider = (
  key: string,
  provider: DraftProvider,
): (() => void) => {
  draftProviders.set(key, provider);
  return () => {
    if (draftProviders.get(key) === provider) {
      draftProviders.delete(key);
    }
  };
};

/** Snapshot the current context right before redirecting to Auth0. */
export const saveReturnContext = (): IReturnContext => {
  const drafts: Record<string, unknown> = {};
  for (const [key, provider] of draftProviders) {
    try {
      const value = provider();
      if (value !== undefined && value !== null) {
        drafts[key] = value;
      }
    } catch {
      // A failing provider must not block sign-in.
    }
  }
  const context: IReturnContext = {
    returnTo: getCurrentReturnTo(),
    savedAt: Date.now(),
    drafts,
  };
  writeJson(RETURN_CONTEXT_KEY, context);
  return context;
};

const readReturnContext = (): IReturnContext | null => {
  const value = readJson(RETURN_CONTEXT_KEY);
  if (!isRecord(value)) {
    return null;
  }
  const savedAt = typeof value.savedAt === 'number' ? value.savedAt : 0;
  if (Date.now() - savedAt > CONTEXT_TTL_MS) {
    getStorage()?.removeItem(RETURN_CONTEXT_KEY);
    return null;
  }
  const returnTo = sanitizeReturnTo(value.returnTo) ?? '/';
  const drafts = isRecord(value.drafts) ? value.drafts : {};
  return { returnTo, savedAt, drafts };
};

/** Read (and remove) a draft saved before re-authentication. */
export const consumeDraft = (key: string): unknown => {
  const context = readReturnContext();
  if (context === null || !(key in context.drafts)) {
    return null;
  }
  const { [key]: draft, ...rest } = context.drafts;
  writeJson(RETURN_CONTEXT_KEY, { ...context, drafts: rest });
  return draft;
};

/** Return target saved for the in-progress re-login, if any. */
export const getSavedReturnTo = (): string | null =>
  readReturnContext()?.returnTo ?? null;

export const clearReturnContext = (): void => {
  getStorage()?.removeItem(RETURN_CONTEXT_KEY);
};

const readAttempts = (): number[] => {
  const value = readJson(LOGIN_ATTEMPTS_KEY);
  if (!Array.isArray(value)) {
    return [];
  }
  const now = Date.now();
  return value.filter(
    (entry): entry is number =>
      typeof entry === 'number' && now - entry < LOGIN_ATTEMPT_WINDOW_MS,
  );
};

/** True while the redirect budget for the current window is not exhausted. */
export const canAttemptLoginRedirect = (): boolean =>
  readAttempts().length < MAX_LOGIN_ATTEMPTS;

/**
 * Records a login redirect. Returns false (and records a diagnostic) when the
 * budget is exhausted, in which case the caller must not redirect.
 */
export const recordLoginRedirect = (source: string): boolean => {
  const attempts = readAttempts();
  if (attempts.length >= MAX_LOGIN_ATTEMPTS) {
    recordAuthDiagnostic('login.loop-prevented', {
      source,
      attempts: attempts.length,
    });
    return false;
  }
  writeJson(LOGIN_ATTEMPTS_KEY, [...attempts, Date.now()]);
  recordAuthDiagnostic('login.redirect', { source });
  return true;
};

/** Called after a successful authentication to reset the loop guard. */
export const clearLoginAttempts = (): void => {
  getStorage()?.removeItem(LOGIN_ATTEMPTS_KEY);
};
