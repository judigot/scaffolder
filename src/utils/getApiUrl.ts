/**
 * Builds the API URL from environment variables
 * Follows the pattern from vite-react template:
 * - VITE_BACKEND_HOST (e.g., "http://localhost")
 * - VITE_BACKEND_PORT (e.g., "5000")
 * - VITE_API_URL (e.g., "api")
 *
 * Returns: "http://localhost:5000/api" or "/api" if no backendHost
 */
export const getApiUrl = (): string => {
  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
  const apiPath = String(import.meta.env.VITE_API_URL ?? 'api');
  const backendUrl = backendHost ? `${backendHost}:${port}` : '';
  return backendUrl ? `${backendUrl}/${apiPath}` : `/${apiPath}`;
};

/**
 * Gets the base backend URL (without API path)
 */
export const getBackendUrl = (): string => {
  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
  return backendHost ? `${backendHost}:${port}` : '';
};
