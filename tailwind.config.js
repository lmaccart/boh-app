/** @type {import('tailwindcss').Config} */
// Colors are sourced from a single palette file shared with the app's TS code
// (`src/theme/colors.ts`). Do not hardcode hex values in components — use the
// className tokens these generate (e.g. `bg-primary`, `text-muted-foreground`).
const palette = require("./src/theme/palette.json");

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
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
