import { defineConfig } from 'vite';

// base './': the built game works from any folder (GitHub Pages at /midnight-restaurant/, and framed by 夜ふかし as ../midnight-restaurant/)
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2020', sourcemap: true, rollupOptions: { input: { main: 'index.html', floor: 'floor.html', k3d: '3d.html' } } },
  server: { port: 5173 },
});
