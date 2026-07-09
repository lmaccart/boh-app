// ESLint flat config (ESLint 9+). Uses Expo's shared config.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      "babel.config.js",
      "boh-admin/*",
      "supabase/functions/*", // Deno runtime — not lintable with node resolution
      ".claude/*",
    ],
  },
];
