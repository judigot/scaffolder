/**
 * Structured, privacy-safe diagnostics for authentication recovery.
 *
 * Events never include tokens, authorization headers, emails or request
 * bodies. Values that look like credentials are redacted defensively so a
 * future caller cannot leak secrets by accident.
 */

export type AuthDiagnosticEvent =
  | 'token.refresh.start'
  | 'token.refresh.success'
  | 'token.refresh.failure'
  | 'session.revalidate'
  | 'session.expired'
  | 'session.restored'
  | 'session.identity-changed'
  | 'request.unauthorized'
  | 'request.forbidden'
  | 'request.retry'
  | 'request.blocked'
  | 'login.redirect'
  | 'login.loop-prevented'
  | 'connectivity.offline'
  | 'connectivity.online';

export type AuthDiagnosticDetails = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface IAuthDiagnosticRecord {
  scope: 'auth';
  event: AuthDiagnosticEvent;
  at: string;
  details: AuthDiagnosticDetails;
}

const SENSITIVE_KEY =
  /token|authorization|secret|password|passphrase|cookie|email|code/i;
const JWT_LIKE = /^[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}$/;
const BEARER_LIKE = /bearer\s+\S+/i;
const MAX_BUFFER = 50;

const buffer: IAuthDiagnosticRecord[] = [];

type DiagnosticSink = (record: IAuthDiagnosticRecord) => void;

const defaultSink: DiagnosticSink = (record) => {
  if (import.meta.env.MODE === 'test') {
    return;
  }
  const isFailure =
    record.event.endsWith('failure') ||
    record.event === 'session.expired' ||
    record.event === 'login.loop-prevented';
  // Only failures are logged; routine events stay in the in-memory buffer.
  if (isFailure) {
    console.warn('[auth]', record.event, record.details);
  }
};

let sink: DiagnosticSink = defaultSink;

const sanitizeValue = (
  key: string,
  value: string | number | boolean | null | undefined,
): string | number | boolean | null | undefined => {
  if (SENSITIVE_KEY.test(key) && key !== 'errorCode') {
    return '[redacted]';
  }
  if (typeof value === 'string') {
    if (JWT_LIKE.test(value) || BEARER_LIKE.test(value)) {
      return '[redacted]';
    }
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  return value;
};

export const sanitizeDiagnosticDetails = (
  details: AuthDiagnosticDetails,
): AuthDiagnosticDetails => {
  const result: AuthDiagnosticDetails = {};
  for (const [key, value] of Object.entries(details)) {
    result[key] = sanitizeValue(key, value);
  }
  return result;
};

export const recordAuthDiagnostic = (
  event: AuthDiagnosticEvent,
  details: AuthDiagnosticDetails = {},
): IAuthDiagnosticRecord => {
  const record: IAuthDiagnosticRecord = {
    scope: 'auth',
    event,
    at: new Date().toISOString(),
    details: sanitizeDiagnosticDetails(details),
  };
  buffer.push(record);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }
  try {
    sink(record);
  } catch {
    // Diagnostics must never break the app.
  }
  return record;
};

/** Recent diagnostics (newest last) for support/debug tooling and tests. */
export const getAuthDiagnostics = (): readonly IAuthDiagnosticRecord[] => [
  ...buffer,
];

export const clearAuthDiagnostics = (): void => {
  buffer.length = 0;
};

/** Replace the sink (e.g. to forward to an observability backend or in tests). */
export const setAuthDiagnosticSink = (next: DiagnosticSink | null): void => {
  sink = next ?? defaultSink;
};
