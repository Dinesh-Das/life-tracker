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
    minify: 'oxc',
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
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/]react(?:-dom|-router|-router-dom)?[\\/]/.test(id)) return 'react-vendor'
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/date-fns')) return 'date-utils'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          return undefined
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
