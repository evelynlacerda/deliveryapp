import { defineConfig } from 'vite';

// Porta própria para não colidir com o projeto principal (3000, 5173, 8080...)
export default defineConfig({
  root: '.',
  base: './',
  server: { port: 4321, open: true },
  preview: { port: 4322 },
  build: { outDir: 'dist', emptyOutDir: true }
});
