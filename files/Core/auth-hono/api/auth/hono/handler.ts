import type { Context } from 'hono';
import { getBetterAuth } from '../better-auth';

export function betterAuthHandler(c: Context): Promise<Response> | Response {
  return getBetterAuth().handler(c.req.raw);
}
