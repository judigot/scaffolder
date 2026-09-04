import { db } from '@/api/db';
import { session, user } from '@/api/db/schema';
import { account, verification } from '@/api/db/auth-schema';
import { getBetterAuth, initializeBetterAuth } from '@/api/auth/better-auth';

export const dynamic = 'force-dynamic';

function getAuth() {
  try {
    return getBetterAuth();
  } catch {
    return initializeBetterAuth(db, session, user, {
      account,
      verification,
    });
  }
}

export async function GET(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export async function POST(request: Request): Promise<Response> {
  return getAuth().handler(request);
}
