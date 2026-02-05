/**
 * Builds the API URL from environment variables
 * - Local dev: Returns "/api" (relative path)
 * - Remote dev: Returns "{BASE_URL}api" (e.g., "/scaffolder/api")
 *
 * Uses BASE_URL from Vite config to ensure API calls go through nginx proxy
 */
export const getApiUrl = (): string => {
  const baseUrl: unknown = import.meta.env.BASE_URL;
  const apiPath: unknown = import.meta.env.VITE_API_URL;
  return `${typeof baseUrl === 'string' ? baseUrl : '/'}${typeof apiPath === 'string' ? apiPath : 'api'}`;
};
