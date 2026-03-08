/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2E7D32',
                    light: '#4CAF50',
                    dark: '#1B5E20',
                },
                accent: {
                    amber: '#FF8F00',
                    red: '#C62828',
                    blue: '#1565C0',
                },
                background: {
                    dark: '#0D1117',
                    card: '#FFFFFF',
                    subtle: '#FAFAFA',
                }
            },
            fontFamily: {
                serif: ['"DM Serif Display"', 'serif'],
                sans: ['"DM Sans"', 'sans-serif'],
            },
            keyframes: {
                checkPop: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.35)' },
                    '100%': { transform: 'scale(1)' },
                }
            },
            animation: {
                checkPop: 'checkPop 0.2s ease-in-out',
            }
        },
    },
    plugins: [],
}
