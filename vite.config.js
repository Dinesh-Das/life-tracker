import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Vitest
  test: {
    environment: 'jsdom',
  },

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
      input: {
        main: './index.html',
        privacy: './privacy.html',
        terms: './terms.html'
      },
      output: {
        // Manual code splitting to keep initial bundle small
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'date-utils': ['date-fns'],
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
