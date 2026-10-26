import { defineConfig } from 'vite';
import wikiPages from './scripts/wiki-pages.js';
import lanHost from './scripts/lan-host.js';

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
    allowedHosts: ['smilewikihtml.local'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['smilewikihtml.local'],
  },
  plugins: [lanHost(), wikiPages()],
});