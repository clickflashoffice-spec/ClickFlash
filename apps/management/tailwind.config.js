import sharedConfig from "../../packages/config/tailwind.config.js";

/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedConfig],
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
    theme: {
        extend: {
            colors: {
                canvas: '#0B111F',
                surface: '#131C31',
                obsidian: '#070b14',
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
                purple: {
                    400: "#a78bfa",
                    500: "#8b5cf6",
                    600: "#7c3aed",
                    700: "#6d28d9",
                    800: "#5b21b6",
                    900: "#4c1d95",
                    DEFAULT: "#8B5CF6",
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
        },
    },
    plugins: [],
}

