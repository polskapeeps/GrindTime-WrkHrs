// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/GrindTime-WrkHrs/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // Automatically detect entry points
      input: './index.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];

          // CSS files
          if (extType === 'css') {
            return 'assets/css/[name]-[hash].[ext]';
          }

          // Images and icons (keep original names for PWA)
          if (['png', 'jpg', 'jpeg', 'svg', 'ico', 'webp'].includes(extType)) {
            return 'assets/icons/[name].[ext]';
          }

          // Other assets
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
});
