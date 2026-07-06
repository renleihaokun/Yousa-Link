import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yousa-link.pages.dev',
  vite: {
    optimizeDeps: {
      exclude: ['echarts']
    }
  }
});
