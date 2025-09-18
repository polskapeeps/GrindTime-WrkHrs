// vite.config.js
import { defineConfig, loadEnv } from 'vite';

const normalizeBasePath = (value) => {
  if (!value || value === '/') {
    return '/';
  }

  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = normalizeBasePath(env.BASE_PATH ?? env.VITE_BASE_PATH ?? '/');

  return {
    base: basePath,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        input: './index.html',
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];

            if (extType === 'css') {
              return 'assets/css/[name]-[hash].[ext]';
            }

            if (['png', 'jpg', 'jpeg', 'svg', 'ico', 'webp'].includes(extType)) {
              return 'assets/icons/[name].[ext]';
            }

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
  };
});
