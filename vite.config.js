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
    // The MUI preview is a page of its own, in an iframe.
    rolldownOptions: {
      input: { main: 'demo/index.html', mui: 'demo/mui-preview.html' },
      // MUI's "use client" lines are for React servers. They do nothing here.
      onLog: (level, log, handler) => { if (log.code !== 'MODULE_LEVEL_DIRECTIVE') handler(level, log); },
    },
  },
});
