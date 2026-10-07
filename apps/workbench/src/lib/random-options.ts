import { createPolyhedron, SHAPES } from "@noble-polyhedra/core";
import { DEFAULT_WORKBENCH_OPTIONS, type PaletteName, type RenderView, type WorkbenchOptions } from "@noble-polyhedra/render";

export const PALETTES: Record<PaletteName, { color: string; background: string; colors: readonly string[]; backgrounds: readonly string[] }> = {
  aurora: { color: "#5ce0d3", background: "#07131d", colors: ["#5ce0d3", "#76bedb", "#92dbc1"], backgrounds: ["#07131d", "#12202b", "#182431"] },
  coral: { color: "#ffad8c", background: "#21101b", colors: ["#ffad8c", "#f495a5", "#f6c28e"], backgrounds: ["#21101b", "#2c1a24", "#271b21"] },
  violet: { color: "#c0adff", background: "#131025", colors: ["#c0adff", "#a9b8f9", "#d4a8df"], backgrounds: ["#131025", "#1d1a30", "#252039"] },
  gold: { color: "#ffce83", background: "#20150d", colors: ["#ffce83", "#e9b970", "#f1d7a3"], backgrounds: ["#20150d", "#2b2119", "#272018"] },
};

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;
const between = (min: number, max: number): number => Math.round((min + Math.random() * (max - min)) * 100) / 100;

export function surpriseOptions(): WorkbenchOptions {
  const shape = pick(SHAPES).id;
  const palette = pick(Object.keys(PALETTES) as PaletteName[]);
  const colors = PALETTES[palette];
  const view = pick<RenderView>(["solid", "solid", "solid-wireframe", "solid-wireframe", "wireframe", "face", "face-context"]);
  const family = shape === "stephanoid" || shape === "antistephanoid";
  const n = family ? pick([5, 7, 9]) : 5;
  const p = shape === "antistephanoid" ? 2 : 3;
  const q = 1;
  const crownHeight = between(0.5, 1.1);
  const a = between(0.7, 1.4), b = between(0.7, 1.4), c = between(0.7, 1.4);
  const faces = createPolyhedron({ shape, n, p, q, crownHeight, a, b, c }).faces.length;
  return {
    ...DEFAULT_WORKBENCH_OPTIONS, shape, view, palette,
    color: pick(colors.colors), background: Math.random() < 0.18 ? "transparent" : pick(colors.backgrounds),
    yaw: between(-1.5, 1.5), pitch: view === "face" ? 0 : between(0.2, 1.05),
    rotation: undefined, zoom: between(0.82, 1.16), faceIndex: Math.floor(Math.random() * faces),
    n, p, q, crownHeight, a, b, c,
    rotate: Math.random() < 0.4 ? 0 : between(0.18, 0.58),
    float: Math.random() < 0.4 ? 0 : between(0.2, 0.7),
    theme: Math.random() < 0.5 ? "light" : "dark",
  };
}
