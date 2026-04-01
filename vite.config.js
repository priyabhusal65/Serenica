// vite.config.js  (place in your frontend root, next to package.json)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /auth, /student, /assessment, /admin requests to FastAPI
    // so the browser never makes a cross-origin request during development.
    // This eliminates all CORS preflight issues locally.
    proxy: {
      '/auth':       { target: 'http://localhost:8000', changeOrigin: true },
      '/student':    { target: 'http://localhost:8000', changeOrigin: true },
      '/assessment': { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':      { target: 'http://localhost:8000', changeOrigin: true },
      '/health':     { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})