/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  // base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: Number(process.env.VITE_FRONTEND_PORT),
    proxy: {
      '/api': `${String(process.env.VITE_BACKEND_HOST)}:${String(process.env.VITE_BACKEND_PORT)}`,
    },
  },
  plugins: [react(), tsconfigPaths()],
});
