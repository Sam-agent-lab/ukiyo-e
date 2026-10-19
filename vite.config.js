import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    cssMinify: true,
  },
  preview: {
    // Il preview viene esposto con un tunnel temporaneo a hostname casuale.
    allowedHosts: true,
  },
});
