/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
import path from 'node:path';
export default defineConfig({
  /* </newBuildOutput> */ /*<alias>*/ resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  /*</alias>*/ /*<devPort>*/ server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'config',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tsconfigPaths()],
});
