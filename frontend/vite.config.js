import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const DEV_PORT = 5173;

export default defineConfig({
  plugins: [
    react({
      // Должен совпадать с server.port, иначе HMR/WebSocket в dev может ломаться (белый/пустой экран)
      reactRefreshHost: `http://localhost:${DEV_PORT}`,
    }),
  ],
  server: {
    port: DEV_PORT,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
