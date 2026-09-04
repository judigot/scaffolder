import { createAuthClient } from 'better-auth/react';

const BASE_PATH = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

export const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
