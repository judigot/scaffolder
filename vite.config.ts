/// <reference types="vitest" />

import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const isDevelopment = process.env.NODE_ENV === 'development';
const backendHost = String(process.env.VITE_BACKEND_HOST || 'http://localhost');
const isLiveServer =
  isDevelopment &&
  !backendHost.includes('localhost') &&
  !backendHost.includes('127.0.0.1');

/* TEMPORARY — restore after agent-scaffold is solid.
 * Template/worktree trees are not part of the Vite app graph. */
const ignoredTemplateTrees = [
  '**/files/**',
  '**/files.test/**',
  '**/.apps/**',
  '**/.worktrees/**',
];

export default defineConfig({
  base: isLiveServer ? '/scaffolder/' : '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: isLiveServer ? '0.0.0.0' : true,
    port: Number(process.env.VITE_FRONTEND_PORT),
    allowedHosts: ['judigot.com', 'www.judigot.com'],
    proxy: {
      '/api': `${backendHost}:${String(process.env.VITE_BACKEND_PORT)}`,
    },
    hmr: isLiveServer
      ? {
          protocol: 'wss',
          host: 'judigot.com',
          clientPort: 443,
          path: '/scaffolder/__vite_hmr',
        }
      : undefined,
    watch: {
      ignored: ignoredTemplateTrees,
    },
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', ...ignoredTemplateTrees],
    },
  },
  plugins: [tailwindcss(), react(), tsconfigPaths()],
});
