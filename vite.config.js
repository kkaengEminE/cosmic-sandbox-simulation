import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cosmic-sandbox-simulation/',
  server: { port: 5173, open: false },
  build: { target: 'esnext' },
});
