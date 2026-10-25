import { defineConfig } from 'vite';

export default defineConfig({
  root: 'smilewikihtml',
  base: '/smilewikihtml/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['macbook-pro-igor.local'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});