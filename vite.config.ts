/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  base: './',
  server: {
    host: true,
    port: Number(process.env.VITE_FRONTEND_PORT),
  },
  plugins: [react(), tsconfigPaths()],
});
