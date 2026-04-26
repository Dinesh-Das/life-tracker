/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Digital Sanctuary Palette ──────────────────
                surface: {
                    DEFAULT: '#0a160f',
                    dim: '#0a160f',
                    bright: '#303c34',
                    lowest: '#05110a',
                    low: '#121e17',
                    base: '#16221b',
                    high: '#212d25',
                    highest: '#2b3830',
                },
                'on-surface': '#d8e6db',
                'on-surface-variant': '#9ab0a2',
                outline: '#8b928d',
                'outline-variant': '#414844',
                primary: {
                    DEFAULT: '#a9cfbc',
                    container: '#2d4f41',
                    'on-primary': '#14362a',
                    fixed: '#c5ebd8',
                },
                secondary: {
                    DEFAULT: '#aecebe',
                    container: '#304d40',
                },
                // Main content area (minty green gradient captured as color)
                'mint-light': '#c2d9cc',
                'mint-mid': '#9bbfaf',
                'mint-dark': '#8da89b',
                // Legacy — keep for any remaining references
                background: {
                    dark: '#0a160f',
                    card: '#FFFFFF',
                    subtle: '#0a160f',
                },
                // Semantic aliases
                'forest-deep': '#1a2e24',
                'forest-mid': '#3d5a4a',
                'forest-bright': '#4a7a62',
            },
            fontFamily: {
                serif: ['"Newsreader"', 'Georgia', 'serif'],
                sans: ['"Manrope"', 'system-ui', 'sans-serif'],
                display: ['"Newsreader"', 'Georgia', 'serif'],
                body: ['"Manrope"', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'sm': '4px',
                DEFAULT: '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '24px',
                'full': '9999px',
            },
            backdropBlur: {
                'glass': '24px',
                'sidebar': '40px',
                'modal': '40px',
            },
            keyframes: {
                checkPop: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.35)' },
                    '100%': { transform: 'scale(1)' },
                },
                fadeUp: {
                    from: { opacity: '0', transform: 'translateY(14px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-400px 0' },
                    '100%': { backgroundPosition: '400px 0' },
                },
                streakPulse: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(169, 207, 188, 0.4)' },
                    '50%': { boxShadow: '0 0 0 8px rgba(169, 207, 188, 0)' },
                },
            },
            animation: {
                checkPop: 'checkPop 0.2s ease-in-out',
                'fade-up': 'fadeUp 0.4s ease-out both',
                shimmer: 'shimmer 1.5s infinite',
                'streak-pulse': 'streakPulse 2s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}
