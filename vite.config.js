import { defineConfig } from 'vite';

export default defineConfig({
  base: '/GrindTime-WrkHrs/',
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  publicDir: 'public', // Ensures manifest.json and sw.js are copied
});
