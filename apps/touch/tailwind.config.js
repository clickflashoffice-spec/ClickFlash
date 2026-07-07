const sharedConfig = require("@clickflash/config/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [sharedConfig],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    ],
};
