// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/GrindTime-WrkHrs/',
  build: {
    assetsDir: '_app_assets',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  publicDir: 'public',
});
