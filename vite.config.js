// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/GrindTime-WrkHrs/',
  build: {
    assetsDir: '_app_assets', // <--- Key change
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  publicDir: 'public',
});
