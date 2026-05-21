import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serve l'app da https://<user>.github.io/abitudini/
// Si imposta `base` solo nella build di produzione.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/abitudini/' : '/',
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
}));
