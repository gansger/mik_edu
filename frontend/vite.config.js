import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Бэкенд слушает на PORT=8000 (см. backend/.env)
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
