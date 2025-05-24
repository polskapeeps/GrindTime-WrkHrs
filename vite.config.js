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
      output: {
        // Keep consistent naming for easier caching
        entryFileNames: '_app_assets/[name]-[hash].js',
        chunkFileNames: '_app_assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return '_app_assets/[name]-[hash].css';
          }
          // Keep original names for PWA assets
          if (assetInfo.name?.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
            return '_app_assets/[name][extname]';
          }
          return '_app_assets/[name]-[hash][extname]';
        },
      },
    },
    // Copy PWA files to root of dist
    copyPublicDir: true,
  },
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
});
