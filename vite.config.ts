/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
import path from 'node:path';
export default defineConfig({
  /* <newBuildOutput> */ build: { outDir: 'dist' },
  /* </testConfig> */ /*<alias>*/ resolve: {
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
  /*</devPort>*/ /* <basepath> */ base: './' /* Resolve asset paths after building */ /* </basepath> */,
  plugins: [react(), tsconfigPaths()],
});
