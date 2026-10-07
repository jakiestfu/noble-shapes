import type { PaletteName } from "./index.js";

export const PALETTES: Record<PaletteName, { color: string; background: string; colors: readonly string[]; backgrounds: readonly string[] }> = {
  aurora: { color: "#5ce0d3", background: "#07131d", colors: ["#5ce0d3", "#76bedb", "#92dbc1"], backgrounds: ["#07131d", "#12202b", "#182431"] },
  coral: { color: "#ffad8c", background: "#21101b", colors: ["#ffad8c", "#f495a5", "#f6c28e"], backgrounds: ["#21101b", "#2c1a24", "#271b21"] },
  violet: { color: "#c0adff", background: "#131025", colors: ["#c0adff", "#a9b8f9", "#d4a8df"], backgrounds: ["#131025", "#1d1a30", "#252039"] },
  gold: { color: "#ffce83", background: "#20150d", colors: ["#ffce83", "#e9b970", "#f1d7a3"], backgrounds: ["#20150d", "#2b2119", "#272018"] },
};
