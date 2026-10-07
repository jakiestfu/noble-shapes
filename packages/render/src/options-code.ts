import { createPolyhedron, SHAPES, type ShapeId } from "@noble-shapes/core";
import type { MaterialName, PaletteName, Quaternion, RenderView } from "./index.js";
import { PALETTES, paletteColors } from "./palettes.js";

/** The form and appearance captured by a shareable design code. */
export interface DesignOptions {
  shape: ShapeId;
  view: RenderView;
  material: MaterialName;
  palette: PaletteName;
  /** Follow this palette's light/dark colors until either color is customized. */
  paletteLinked: boolean;
  color: string;
  background: string;
  faceIndex: number;
  n: number;
  p: number;
  q: number;
  crownHeight: number;
  a: number;
  b: number;
  c: number;
}

/** Design plus local viewer controls, which never enter the URL code. */
export interface WorkbenchOptions extends DesignOptions {
  yaw: number;
  pitch: number;
  rotation?: Quaternion;
  zoom: number;
  rotate: number;
  float: number;
  theme: "light" | "dark";
}

export const DEFAULT_DESIGN_OPTIONS: DesignOptions = {
  shape: "small-stellated-dodecahedron", view: "solid-wireframe", material: "studio", palette: "aurora",
  paletteLinked: true,
  color: "#5ce0d3", background: "#07131d",
  faceIndex: 0, n: 5, p: 3, q: 1, crownHeight: 0.7, a: 1.15, b: 0.9, c: 0.75,
};

export const DEFAULT_WORKBENCH_OPTIONS: WorkbenchOptions = {
  ...DEFAULT_DESIGN_OPTIONS, yaw: 0.6, pitch: 0.72, zoom: 1,
  rotate: 0.25, float: 0.25, theme: "light",
};

/** Resolve a linked palette for the viewer theme; custom colors remain untouched. */
export function designForTheme<T extends DesignOptions>(options: T, theme: "light" | "dark"): T {
  if (!options.paletteLinked) return options;
  const colors = paletteColors(options.palette, theme);
  return { ...options, color: colors.color,
    background: options.background === "transparent" ? "transparent" : colors.background };
}

const VIEWS = new Set<RenderView>(["solid", "solid-wireframe", "wireframe", "face", "face-context"]);
const PALETTE_NAMES = new Set<PaletteName>(Object.keys(PALETTES) as PaletteName[]);
const SHAPE_IDS = new Set<string>(SHAPES.map(item => item.id));
const HEX = /^#[0-9a-f]{6}$/i;
const PREFIX = "np4_";
const PREVIOUS_PREFIX = "np3_";
const OLDER_PREFIX = "np2_";
const OLD_PREFIX = "np1_";

function tuple(options: DesignOptions): unknown[] {
  return [options.shape, options.view, options.palette, options.color, options.background,
    options.faceIndex, options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c, options.paletteLinked, options.material];
}

function parseTuple(value: unknown, checkGeometry: boolean, version: 1 | 2 | 3 | 4 = 4): DesignOptions {
  if (!Array.isArray(value) || value.length !== (version === 1 || version === 2 ? 13 : version === 3 ? 14 : 15)) throw new Error("Design code has an invalid format");
  const [shape, view, palette, color, background, faceIndex, n, p, q, crownHeight, a, b, c] = value as unknown[];
  const numberIn = (item: unknown, min: number, max: number): item is number =>
    typeof item === "number" && Number.isFinite(item) && item >= min && item <= max;
  const integerIn = (item: unknown, min: number, max: number): item is number =>
    numberIn(item, min, max) && Number.isInteger(item);
  if (typeof shape !== "string" || !SHAPE_IDS.has(shape)) throw new Error("Design code has an unknown form");
  if (!VIEWS.has(view as RenderView) || !PALETTE_NAMES.has(palette as PaletteName)) throw new Error("Design code has an unknown view or palette");
  if (typeof color !== "string" || !HEX.test(color) || typeof background !== "string" || (background !== "transparent" && !HEX.test(background))) throw new Error("Design code has an invalid color");
  if (version >= 3 && typeof value[13] !== "boolean") throw new Error("Design code has an invalid palette setting");
  if (version === 4 && value[14] !== "cel" && value[14] !== "studio" && value[14] !== "clay" && value[14] !== "marble") throw new Error("Design code has an invalid material");
  if (!integerIn(faceIndex, 0, 100_000) || !integerIn(n, 3, 64) || !integerIn(p, 1, 63) || !integerIn(q, 1, 63)) throw new Error("Design code has invalid geometry parameters");
  if (!numberIn(crownHeight, 0.1, 2) || !numberIn(a, 0.1, 3) || !numberIn(b, 0.1, 3) || !numberIn(c, 0.1, 3)) throw new Error("Design code has invalid dimensions");
  const selected = PALETTES[palette as PaletteName];
  const linked = (selected.color === color && (selected.background === background || background === "transparent"))
    || (selected.light.color === color && (selected.light.background === background || background === "transparent"));
  const options: DesignOptions = { shape: shape as ShapeId, view: view as RenderView, material: "studio", palette: palette as PaletteName,
    paletteLinked: version < 3 ? linked : value[13] as boolean, color, background, faceIndex, n, p, q, crownHeight, a, b, c };
  if (checkGeometry && faceIndex >= createPolyhedron(options).faces.length) throw new Error("Design code selects a face outside this form");
  return options;
}

/** Encode the form and appearance, leaving camera, motion, and theme local. */
export function optionsToString(options: DesignOptions): string {
  const validated = parseTuple(tuple(options), true);
  const selected = PALETTES[validated.palette];
  const canonical = tuple(validated.paletteLinked ? { ...validated, color: selected.color,
    background: validated.background === "transparent" ? "transparent" : selected.background } : validated);
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  return PREFIX + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a design code. Older np1 codes are accepted, but their viewer state is discarded. */
export function stringToOptions(code: string): DesignOptions {
  if ((!code.startsWith(PREFIX) && !code.startsWith(PREVIOUS_PREFIX) && !code.startsWith(OLDER_PREFIX) && !code.startsWith(OLD_PREFIX)) || code.length > 4096) throw new Error("Unsupported design code");
  try {
    const old = code.startsWith(OLD_PREFIX);
    const previous = code.startsWith(PREVIOUS_PREFIX);
    const older = code.startsWith(OLDER_PREFIX);
    const encoded = code.slice((old ? OLD_PREFIX : older ? OLDER_PREFIX : previous ? PREVIOUS_PREFIX : PREFIX).length).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!old) return parseTuple(value, true, older ? 2 : previous ? 3 : 4);
    if (!Array.isArray(value) || value.length !== 20) throw new Error("Design code has an invalid format");
    return parseTuple([...value.slice(0, 5), ...value.slice(9, 17)], true, 1);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Design code")) throw error;
    throw new Error("Design code could not be read");
  }
}
