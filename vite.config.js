import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Essential for GitHub Pages (relative paths)
  build: {
    outDir: 'dist',
  }
});
