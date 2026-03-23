import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // По умолчанию плагин ждёт Fast Refresh на :3000 — при dev на 80 без этого HMR ломается
      reactRefreshHost: 'http://localhost',
    }),
  ],
  server: {
    port: 80,
    proxy: {
      '/api': {
        // Бэкенд слушает на PORT=8000 (см. backend/.env)
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
