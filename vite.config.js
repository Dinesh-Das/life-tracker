import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Dev server headers (for Google OAuth popup flow)
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    }
  },

  // Production build config
  build: {
    // Minify and tree-shake
    minify: 'esbuild',
    // Raise chunk warning limit slightly (recharts is large)
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        // Manual code splitting to keep initial bundle small
        manualChunks: {
          // React ecosystem in one chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Recharts is the largest dep — load async separately
          'charts': ['recharts'],
          // Date utilities
          'date-utils': ['date-fns'],
          // UI icons
          'icons': ['lucide-react'],
        }
      }
    }
  },

  // Production headers (served by Vite preview — tell your host to mirror these)
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  }
})
