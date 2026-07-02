/** @type {import('tailwindcss').Config} */
// Colors are sourced from the palette shared with the mobile app
// (src/theme/palette.json at the repo root). Do not hardcode hex values in
// components — use the className tokens these generate (e.g. `bg-primary`).
const palette = require("../src/theme/palette.json");

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: palette,
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
