/**
 * Builds the API URL from environment variables
 * Follows the pattern from vite-react template:
 * - VITE_BACKEND_HOST (e.g., "http://localhost")
 * - VITE_BACKEND_PORT (e.g., "5000")
 * - VITE_API_URL (e.g., "api")
 *
 * Returns: "http://localhost:5000/api" or "/api" if no backendHost
 * In production, uses relative URLs since frontend and backend are on the same server
 */
export const getApiUrl = (): string => {
  const isProduction = import.meta.env.PROD;
  const apiPath = String(import.meta.env.VITE_API_URL ?? 'api');

  if (isProduction) {
    return `/${apiPath}`;
  }

  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
  const backendUrl = backendHost ? `${backendHost}:${port}` : '';
  return backendUrl ? `${backendUrl}/${apiPath}` : `/${apiPath}`;
};

/**
 * Gets the base backend URL (without API path)
 * In production, returns empty string (uses relative URLs)
 */
export const getBackendUrl = (): string => {
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    return '';
  }

  const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
  const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
  return backendHost ? `${backendHost}:${port}` : '';
};
