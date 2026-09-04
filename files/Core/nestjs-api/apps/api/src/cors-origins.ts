import { parseCorsOrigins } from './env';

/*
 * Origins allowed when CORS_ORIGINS is not configured. These cover the
 * local Vite (3001) and Next.js (3002) dev servers.
 */
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

export function resolveAllowedOrigins(): string[] {
  const configured = parseCorsOrigins();

  if (configured === undefined || configured.length === 0) {
    return DEVELOPMENT_ORIGINS;
  }

  return configured;
}
