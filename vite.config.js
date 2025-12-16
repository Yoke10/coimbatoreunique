import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1600, // Increase limit to 1.6MB to silence warnings for large libs
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/analytics'],
          'vendor-ui': ['framer-motion', 'gsap', 'lucide-react', 'canvas-confetti'],
          'vendor-utils': ['jspdf', 'html2canvas'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['pdfjs-dist']
        }
      }
    }
  }
})
