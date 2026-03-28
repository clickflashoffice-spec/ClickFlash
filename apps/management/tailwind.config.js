/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./apps/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // CF Design System Tokens (mapped to CSS variables)
                cf: {
                    base:    'var(--cf-bg-base)',
                    panel:   'var(--cf-bg-panel)',
                    surface: 'var(--cf-bg-surface)',
                    elevated:'var(--cf-bg-elevated)',
                    border:  'var(--cf-border)',
                    blue:    'var(--cf-accent-blue)',
                    emerald: 'var(--cf-accent-emerald)',
                    amber:   'var(--cf-accent-amber)',
                    violet:  'var(--cf-accent-violet)',
                    rose:    'var(--cf-accent-rose)',
                    cyan:    'var(--cf-accent-cyan)',
                },
                cyan: {
                    400: "#22d3ee",
                    500: "#06b6d4",
                    600: "#0891b2",
                    700: "#0e7490",
                    800: "#155e75",
                    900: "#164e63",
                    DEFAULT: "#00B4D8",
                    hover: "#0096B4",
                },
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                }
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'fade-in-down': 'fadeInDown 0.5s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 10px rgba(59,130,246,0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(59,130,246,0.6)' },
                },
            },
            backdropBlur: {
                '4xl': '72px',
            },
        },
    },
    plugins: [],
}

