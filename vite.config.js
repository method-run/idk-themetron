// Vite serves and builds the playground only. The engine in src/ needs no build.
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  base: './',
  server: {
    port: 4321, // If it is in use, Vite tries the next port.
    open: true,
  },
  preview: {
    port: 4321,
    open: true,
  },
  build: {
    outDir: '../_site/play',
    emptyOutDir: true,
  },
});
