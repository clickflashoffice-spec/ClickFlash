/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#030712',
          surface: '#0f172a',
          card: '#1e293b',
          primary: '#38bdf8',
          accent: '#818cf8',
        }
      }
    },
  },
  plugins: [],
}
