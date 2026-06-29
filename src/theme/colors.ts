// Single source of truth for color, shared with `tailwind.config.js`.
// Use NativeWind className tokens (e.g. `bg-primary`) for styling components;
// import `colors` only where a raw value is unavoidable (ActivityIndicator,
// StatusBar, navigation theming).
import palette from "./palette.json";

export const colors = palette;
export type Palette = typeof palette;
