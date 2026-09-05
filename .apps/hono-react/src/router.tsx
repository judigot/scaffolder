import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { AuthContextValue } from './auth/context/AuthContext';

// Get basepath from Vite's BASE_URL (handles subpath deployments like /hono-react/)
const basepath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '/';

export const router = createRouter({
  routeTree,
  basepath,
  defaultPreload: 'intent',
  context: {
    auth: undefined!,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export type { AuthContextValue };
