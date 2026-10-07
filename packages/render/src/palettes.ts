import type { PaletteName } from "./index.js";

export interface PaletteColors { color: string; background: string }
export interface PaletteDefinition extends PaletteColors {
  name: string;
  light: PaletteColors;
}

/** The top-level colors are stable dark defaults for Node and web components. */
export const PALETTES: Record<PaletteName, PaletteDefinition> = {
  aurora: { name: "Aurora", color: "#5ce0d3", background: "#07131d", light: { color: "#168d88", background: "#e9f4f1" } },
  coral: { name: "Coral", color: "#ffad8c", background: "#21101b", light: { color: "#cb614e", background: "#fbefeb" } },
  violet: { name: "Violet", color: "#c0adff", background: "#131025", light: { color: "#7458bd", background: "#f1edfa" } },
  gold: { name: "Gold", color: "#ffce83", background: "#20150d", light: { color: "#a26b22", background: "#f8f2e7" } },
  glacier: { name: "Glacier", color: "#89c8ff", background: "#0b1826", light: { color: "#347cad", background: "#eaf2f8" } },
  jade: { name: "Jade", color: "#8cdaa4", background: "#0b1d18", light: { color: "#37885e", background: "#eaf4ed" } },
  rose: { name: "Rose", color: "#f0a4c4", background: "#25131f", light: { color: "#b45d85", background: "#f9edf2" } },
  ember: { name: "Ember", color: "#ee9869", background: "#23140e", light: { color: "#b85d36", background: "#f8efe8" } },
};

export function paletteColors(palette: PaletteName, theme: "light" | "dark"): PaletteColors {
  const selected = PALETTES[palette];
  return theme === "light" ? selected.light : selected;
}
