import { createPolyhedron, SHAPES, type ShapeId } from "@noble-polyhedra/core";
import type { PaletteName, Quaternion, RenderView } from "./index.js";

/** The form and appearance captured by a shareable design code. */
export interface DesignOptions {
  shape: ShapeId;
  view: RenderView;
  palette: PaletteName;
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
  shape: "small-stellated-dodecahedron", view: "solid-wireframe", palette: "aurora",
  color: "#5ce0d3", background: "#07131d",
  faceIndex: 0, n: 5, p: 3, q: 1, crownHeight: 0.7, a: 1.15, b: 0.9, c: 0.75,
};

export const DEFAULT_WORKBENCH_OPTIONS: WorkbenchOptions = {
  ...DEFAULT_DESIGN_OPTIONS, yaw: 0.6, pitch: 0.72, zoom: 1,
  rotate: 0, float: 0, theme: "light",
};

const VIEWS = new Set<RenderView>(["solid", "solid-wireframe", "wireframe", "face", "face-context"]);
const PALETTES = new Set<PaletteName>(["aurora", "coral", "violet", "gold"]);
const SHAPE_IDS = new Set<string>(SHAPES.map(item => item.id));
const HEX = /^#[0-9a-f]{6}$/i;
const PREFIX = "np2_";
const OLD_PREFIX = "np1_";

function tuple(options: DesignOptions): unknown[] {
  return [options.shape, options.view, options.palette, options.color, options.background,
    options.faceIndex, options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c];
}

function parseTuple(value: unknown, checkGeometry: boolean): DesignOptions {
  if (!Array.isArray(value) || value.length !== 13) throw new Error("Design code has an invalid format");
  const [shape, view, palette, color, background, faceIndex, n, p, q, crownHeight, a, b, c] = value as unknown[];
  const numberIn = (item: unknown, min: number, max: number): item is number =>
    typeof item === "number" && Number.isFinite(item) && item >= min && item <= max;
  const integerIn = (item: unknown, min: number, max: number): item is number =>
    numberIn(item, min, max) && Number.isInteger(item);
  if (typeof shape !== "string" || !SHAPE_IDS.has(shape)) throw new Error("Design code has an unknown form");
  if (!VIEWS.has(view as RenderView) || !PALETTES.has(palette as PaletteName)) throw new Error("Design code has an unknown view or palette");
  if (typeof color !== "string" || !HEX.test(color) || typeof background !== "string" || (background !== "transparent" && !HEX.test(background))) throw new Error("Design code has an invalid color");
  if (!integerIn(faceIndex, 0, 100_000) || !integerIn(n, 3, 64) || !integerIn(p, 1, 63) || !integerIn(q, 1, 63)) throw new Error("Design code has invalid geometry parameters");
  if (!numberIn(crownHeight, 0.1, 2) || !numberIn(a, 0.1, 3) || !numberIn(b, 0.1, 3) || !numberIn(c, 0.1, 3)) throw new Error("Design code has invalid dimensions");
  const options: DesignOptions = { shape: shape as ShapeId, view: view as RenderView, palette: palette as PaletteName,
    color, background, faceIndex, n, p, q, crownHeight, a, b, c };
  if (checkGeometry && faceIndex >= createPolyhedron(options).faces.length) throw new Error("Design code selects a face outside this form");
  return options;
}

/** Encode the form and appearance, leaving camera, motion, and theme local. */
export function optionsToString(options: DesignOptions): string {
  const canonical = tuple(parseTuple(tuple(options), true));
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  return PREFIX + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a design code. Older np1 codes are accepted, but their viewer state is discarded. */
export function stringToOptions(code: string): DesignOptions {
  if ((!code.startsWith(PREFIX) && !code.startsWith(OLD_PREFIX)) || code.length > 4096) throw new Error("Unsupported design code");
  try {
    const old = code.startsWith(OLD_PREFIX);
    const encoded = code.slice((old ? OLD_PREFIX : PREFIX).length).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!old) return parseTuple(value, true);
    if (!Array.isArray(value) || value.length !== 20) throw new Error("Design code has an invalid format");
    return parseTuple([...value.slice(0, 5), ...value.slice(9, 17)], true);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Design code")) throw error;
    throw new Error("Design code could not be read");
  }
}
