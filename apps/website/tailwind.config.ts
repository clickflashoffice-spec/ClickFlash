import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cyan: {
                    400: "#22d3ee",
                    500: "#06b6d4",
                    DEFAULT: "#00BCD4", // Primary PixelHoliday Turquoise
                    hover: "#00acc1",
                },
                navy: {
                    DEFAULT: "#1A237E",
                    900: "#0d1b3e",
                },
                slate: {
                    900: "#0f172a",
                },
                gold: {
                    500: "#EAB308",
                }
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                serif: ["var(--font-playfair)", "serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
