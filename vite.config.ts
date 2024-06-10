/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
import path from 'path';
export default defineConfig({
  /* <newBuildOutput> */ build: { outDir: 'dist/public' },
  /* </newBuildOutput> */ /* <testConfig> */ test: {
    globals: true,
    environment: 'jsdom',
  },
  /* </testConfig> */ /*<alias>*/ resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  /*</alias>*/ /*<devPort>*/ server: { port: 3000 },
  /*</devPort>*/ /* <basepath> */ base: './' /* Resolve asset paths after building */ /* </basepath> */,
  plugins: [react(), tsconfigPaths()],
});
