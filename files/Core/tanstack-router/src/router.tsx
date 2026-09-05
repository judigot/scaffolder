import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { AuthContextValue } from '../../auth-react/src/types';

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    // Auth will be passed from App component
    auth: undefined!,
  },
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export type { AuthContextValue };
