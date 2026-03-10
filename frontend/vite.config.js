import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Порт бэкенда: по умолчанию 3001 (если в backend/.env задан PORT=8000 — поменяйте на 8000)
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
