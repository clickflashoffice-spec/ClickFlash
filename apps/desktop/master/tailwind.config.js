import sharedConfig from "../../../packages/config/tailwind.config.js";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedConfig],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "!**/node_modules/**",
  ],
};
