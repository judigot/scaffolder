/**
 * Centralized authenticated transport for Scaffolder's own API.
 *
 * - Retrieves a valid access token immediately before each request.
 * - Maps 401/403/network/server failures into typed `ApiError`s.
 * - On 401 it forces one silent token refresh. Only requests explicitly marked
 *   idempotent are replayed automatically; non-idempotent requests (Terraform
 *   runs, workspace creation/deletion, config changes) are never replayed.
 * - Blocks requests while the session is expired, so an expired session can
 *   never trigger an infrastructure mutation.
 */
import {
  ApiError,
  classifyHttpStatus,
  isApiError,
} from '@/lib/auth/authErrors.ts';
import { recordAuthDiagnostic } from '@/lib/auth/authDiagnostics.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import { getAccessToken } from '@/lib/auth/tokenManager.ts';
import { getErrorMessage } from '@/schemas/apiResponses.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_SERVER_MESSAGE_LENGTH = 300;

export interface IAuthFetchOptions extends Omit<
  RequestInit,
  'body' | 'headers' | 'method'
> {
  method?: 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body; serialized and sent with `Content-Type: application/json`. */
  json?: unknown;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  /**
   * Whether the request may be replayed automatically after a token refresh.
   * Defaults to true for GET/HEAD/OPTIONS and false for everything else.
   * Only set to true for POST endpoints that are pure reads.
   */
  idempotent?: boolean;
  /** Fallback user-facing message for non-2xx responses. */
  errorMessage?: string;
}

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && !navigator.onLine;

/** Resolves an API path (e.g. `/terraform/status`) against the API base URL. */
export const resolveApiUrl = (path: string): string => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const base = getApiUrl();
  if (path.startsWith(base)) {
    return path;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const readErrorBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
};

const buildHttpError = async (
  response: Response,
  fallback: string | undefined,
): Promise<ApiError> => {
  const kind = classifyHttpStatus(response.status);
  const body = await readErrorBody(response);
  const serverMessage = getErrorMessage(body, '');
  const useServerMessage =
    kind !== 'unauthorized' &&
    serverMessage !== '' &&
    serverMessage.length <= MAX_SERVER_MESSAGE_LENGTH;
  return new ApiError({
    kind,
    status: response.status,
    message: useServerMessage ? serverMessage : fallback,
  });
};

const send = async (
  url: string,
  token: string,
  options: IAuthFetchOptions,
): Promise<Response> => {
  const {
    json,
    body,
    headers = {},
    idempotent: _idempotent,
    errorMessage: _errorMessage,
    method = 'GET',
    ...init
  } = options;
  const finalHeaders: Record<string, string> = {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
  let finalBody: BodyInit | null | undefined = body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  }
  try {
    return await fetch(url, {
      ...init,
      method,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({
      kind: isOffline() ? 'offline' : 'network',
      cause: error,
    });
  }
};

/**
 * Performs an authenticated request and returns the successful `Response`.
 * @throws ApiError for every non-2xx outcome (never returns a failed response).
 */
export const authFetch = async (
  path: string,
  options: IAuthFetchOptions = {},
): Promise<Response> => {
  const method = options.method ?? 'GET';
  const idempotent = options.idempotent ?? SAFE_METHODS.has(method);
  const url = resolveApiUrl(path);
  const endpoint = url.split('?')[0];

  if (isOffline()) {
    throw new ApiError({ kind: 'offline' });
  }

  const token = await getAccessToken();
  let response = await send(url, token, options);

  if (response.status === 401) {
    recordAuthDiagnostic('request.unauthorized', { endpoint, method });
    useSessionStore.getState().markRecoveryPending();
    // Throws SessionExpiredError if the session cannot be renewed silently.
    const refreshedToken = await getAccessToken({ forceRefresh: true });
    if (!idempotent) {
      throw new ApiError({
        kind: 'unauthorized',
        status: 401,
        message:
          'Your session was refreshed before this action could run. Nothing was changed. Please try again.',
      });
    }
    recordAuthDiagnostic('request.retry', { endpoint, method });
    response = await send(url, refreshedToken, options);
  }

  if (response.status === 403) {
    recordAuthDiagnostic('request.forbidden', { endpoint, method });
  }

  if (!response.ok) {
    throw await buildHttpError(response, options.errorMessage);
  }
  return response;
};

/**
 * Authenticated request that parses a JSON body. Pass a parser (e.g. a zod
 * schema's `parse`) to validate the shape.
 */
export async function authFetchJson(
  path: string,
  options?: IAuthFetchOptions,
): Promise<unknown>;
export async function authFetchJson<T>(
  path: string,
  options: IAuthFetchOptions,
  parse: (data: unknown) => T,
): Promise<T>;
export async function authFetchJson(
  path: string,
  options: IAuthFetchOptions = {},
  parse?: (data: unknown) => unknown,
): Promise<unknown> {
  const response = await authFetch(path, options);
  let data: unknown;
  try {
    data = await response.json();
  } catch (error: unknown) {
    throw new ApiError({ kind: 'invalid-response', cause: error });
  }
  if (parse === undefined) {
    return data;
  }
  try {
    return parse(data);
  } catch (error: unknown) {
    if (isApiError(error)) {
      throw error;
    }
    throw new ApiError({ kind: 'invalid-response', cause: error });
  }
}

/**
 * Drop-in replacement for `fetch` in legacy call sites that inspect the raw
 * `Response` themselves. It attaches a freshly retrieved token (never a
 * cached React/Zustand value) and returns the response as-is, including
 * HTTP errors. On 401 it renews the session in the background (which opens
 * the session-expired dialog if renewal needs interactive login) but never
 * replays the request.
 *
 * @throws SessionExpiredError before sending if the session is expired.
 * @throws ApiError ('network' | 'offline') when the request cannot be sent.
 */
export const authorizedFetch = async (
  input: string,
  init: Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string>;
  } = {},
): Promise<Response> => {
  const token = await getAccessToken();
  const url = resolveApiUrl(input);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({
      kind: isOffline() ? 'offline' : 'network',
      cause: error,
    });
  }
  if (response.status === 401) {
    recordAuthDiagnostic('request.unauthorized', {
      endpoint: url.split('?')[0],
      method: init.method ?? 'GET',
    });
    useSessionStore.getState().markRecoveryPending();
    void getAccessToken({ forceRefresh: true }).catch(() => undefined);
  }
  return response;
};
