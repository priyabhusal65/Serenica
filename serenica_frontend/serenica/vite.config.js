import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth':       { target: 'http://localhost:8000', changeOrigin: true },
      '/student':    { target: 'http://localhost:8000', changeOrigin: true },
      '/assessment': { target: 'http://localhost:8000', changeOrigin: true },
      '/health':     { target: 'http://localhost:8000', changeOrigin: true },

      // Only proxy the actual admin API endpoints — NOT /admin/login or /admin/dashboard
      // which are React pages that must stay in the frontend.
      '/admin/stats':                   { target: 'http://localhost:8000', changeOrigin: true },
      '/admin/risk-distribution-chart': { target: 'http://localhost:8000', changeOrigin: true },
      '/admin/student-growth-chart':    { target: 'http://localhost:8000', changeOrigin: true },
      '/admin/average-score-chart':     { target: 'http://localhost:8000', changeOrigin: true },
      '/admin/students-per-course-chart':{ target: 'http://localhost:8000', changeOrigin: true },
      '/admin/high-risk-students':      { target: 'http://localhost:8000', changeOrigin: true },
      '/admin/student-history':         { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})