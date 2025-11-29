/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  build: { outDir: 'dist' },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  base: './',
  plugins: [react(), tsconfigPaths()],
});
