import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/tasks': 'http://localhost:3000',
      '/profile': 'http://localhost:3000',
      '/inbox': 'http://localhost:3000',
      '/rules': 'http://localhost:3000',
      '/memories': 'http://localhost:3000',
      '/contacts': 'http://localhost:3000',
      '/events': 'http://localhost:3000',
      '/actions': 'http://localhost:3000',
      '/brief': 'http://localhost:3000',
    },
  },
});
