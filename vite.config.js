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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            return 'vendor';
          }
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
