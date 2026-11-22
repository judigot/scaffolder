/**
 * Typed error model for authenticated API calls and session recovery.
 *
 * Every protected request funnels failures into one of these kinds so that
 * presentation code can distinguish "your session expired" from "you lack
 * permission", "you are offline", or "the server failed", instead of treating
 * every failure as missing data.
 */
import { isRecord } from '@/utils/typeGuards.ts';

export type ApiErrorKind =
  | 'session-expired'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'client'
  | 'server'
  | 'network'
  | 'offline'
  | 'invalid-response';

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  'session-expired': 'Your session has expired. Sign in again to continue.',
  unauthorized:
    'We could not verify your session. Please try again in a moment.',
  forbidden: 'You do not have permission to perform this action.',
  'not-found': 'The requested resource could not be found.',
  client: 'The request could not be completed.',
  server: 'The server ran into a problem. Please try again.',
  network: 'We could not reach the server. Check your connection and retry.',
  offline: 'You are offline. We will reconnect automatically.',
  'invalid-response': 'The server returned an unexpected response.',
};

interface IApiErrorOptions {
  kind: ApiErrorKind;
  status?: number | null;
  message?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor({ kind, status = null, message, cause }: IApiErrorOptions) {
    super(message ?? DEFAULT_MESSAGES[kind], { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }

  /** Whether retrying the same request may succeed without user action. */
  get isTransient(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'server' ||
      this.kind === 'offline'
    );
  }
}

export class SessionExpiredError extends ApiError {
  readonly reason: string;

  constructor(reason = 'login_required', cause?: unknown) {
    super({ kind: 'session-expired', status: 401, cause });
    this.name = 'SessionExpiredError';
    this.reason = reason;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

export const isSessionExpiredError = (
  error: unknown,
): error is SessionExpiredError =>
  error instanceof SessionExpiredError ||
  (error instanceof ApiError && error.kind === 'session-expired');

/**
 * Auth0 error codes that can only be resolved through interactive login.
 * See https://auth0.com/docs/libraries/auth0-single-page-app-sdk#error-handling
 */
const INTERACTIVE_LOGIN_ERROR_CODES = new Set([
  'login_required',
  'consent_required',
  'interaction_required',
  'missing_refresh_token',
  'invalid_grant',
  'mfa_required',
  'unauthorized',
  'access_denied',
]);

/** Extracts the OAuth error code from an Auth0 SDK error, if present. */
export const getAuth0ErrorCode = (error: unknown): string | null => {
  if (!isRecord(error) && !(error instanceof Error)) {
    return null;
  }
  const code: unknown = Reflect.get(error, 'error');
  return typeof code === 'string' && code !== '' ? code : null;
};

/**
 * True when Auth0 says the session can no longer be renewed silently
 * (expired/revoked refresh token, user must re-consent, MFA, etc.).
 * Transient failures (timeouts, network) are deliberately excluded.
 */
export const isInteractiveLoginRequired = (error: unknown): boolean => {
  const code = getAuth0ErrorCode(error);
  if (code !== null) {
    return INTERACTIVE_LOGIN_ERROR_CODES.has(code);
  }
  if (error instanceof Error) {
    return /missing refresh token|login required/i.test(error.message);
  }
  return false;
};

/** True for errors that indicate the device is offline or the network failed. */
export const isNetworkFailure = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.kind === 'network' || error.kind === 'offline';
  }
  if (error instanceof TypeError) {
    return /fetch|network|load failed/i.test(error.message);
  }
  return false;
};

export const classifyHttpStatus = (status: number): ApiErrorKind => {
  if (status === 401) {
    return 'unauthorized';
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 404) {
    return 'not-found';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'client';
};

/**
 * Converts any thrown value into a short, user-facing message. Raw technical
 * exceptions (stack traces, zod issues, fetch internals) are never surfaced.
 */
export const toUserMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (isNetworkFailure(error)) {
    return DEFAULT_MESSAGES.network;
  }
  if (error instanceof Error && error.name === 'ZodError') {
    return DEFAULT_MESSAGES['invalid-response'];
  }
  if (error instanceof Error && error.message.trim() !== '') {
    // Keep short human messages produced by our own code paths.
    return error.message.length <= 200 ? error.message : fallback;
  }
  return fallback;
};
