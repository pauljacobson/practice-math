import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Vite configuration for the Preact frontend.
// The /api proxy forwards API requests to the Cloudflare Worker
// running locally on port 8787 during development.
export default defineConfig({
  plugins: [preact()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
