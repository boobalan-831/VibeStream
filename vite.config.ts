import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  // Allow overriding the base path at build time (e.g., GitHub Pages: "/VibeStream/")
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});