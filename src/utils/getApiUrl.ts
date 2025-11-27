/**
 * Builds the API URL from environment variables
 * In development and production, everything runs on the same port
 * - VITE_BACKEND_HOST (optional, e.g., "http://localhost")
 * - VITE_BACKEND_PORT (e.g., "3000")
 * - VITE_API_URL (e.g., "api")
 *
 * Returns: "/api" (relative path since same port) or full URL if backendHost is set
 */
export const getApiUrl = (): string => {
  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '3000');
  const apiPath = String(import.meta.env.VITE_API_URL ?? 'api');
  const backendUrl = backendHost ? `${backendHost}:${port}` : '';
  return backendUrl ? `${backendUrl}/${apiPath}` : `/${apiPath}`;
};

/**
 * Gets the base backend URL (without API path)
 */
export const getBackendUrl = (): string => {
  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '3000');
  return backendHost ? `${backendHost}:${port}` : '';
};
