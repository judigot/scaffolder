import { z } from 'zod';

const AuthEnvironment = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_API_KEY: z.string().trim().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export interface IAuthConfig {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  dashboardApiKey?: string;
}

export function loadAuthConfig(
  environment: Record<string, string | undefined>,
): IAuthConfig {
  const env = AuthEnvironment.parse(environment);
  const baseURL = new URL(env.BETTER_AUTH_URL);
  const origins = (env.CORS_ORIGINS ?? baseURL.origin)
    .split(',')
    .map((value) => value.trim());
  for (const origin of [baseURL.origin, ...origins]) {
    const parsed = new URL(origin);
    if (
      parsed.origin !== origin ||
      !['http:', 'https:'].includes(parsed.protocol)
    ) {
      throw new Error('Auth origins must be exact HTTP(S) origins');
    }
    if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('Production authentication requires HTTPS origins');
    }
  }
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: baseURL.origin,
    trustedOrigins: origins,
    dashboardApiKey: env.BETTER_AUTH_API_KEY,
  };
}
