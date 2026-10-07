import { createPolyhedron, SHAPES, type ShapeId } from "@noble-polyhedra/core";
import type { PaletteName, Quaternion, RenderView } from "./index.js";

/** Every shareable workbench setting. Renderer stats remain a local UI preference. */
export interface WorkbenchOptions {
  shape: ShapeId;
  view: RenderView;
  palette: PaletteName;
  color: string;
  background: string;
  yaw: number;
  pitch: number;
  rotation?: Quaternion;
  zoom: number;
  faceIndex: number;
  n: number;
  p: number;
  q: number;
  crownHeight: number;
  a: number;
  b: number;
  c: number;
  rotate: number;
  float: number;
  theme: "light" | "dark";
}

export const DEFAULT_WORKBENCH_OPTIONS: WorkbenchOptions = {
  shape: "small-stellated-dodecahedron", view: "solid-wireframe", palette: "aurora",
  color: "#5ce0d3", background: "#07131d", yaw: 0.6, pitch: 0.72, zoom: 1,
  faceIndex: 0, n: 5, p: 3, q: 1, crownHeight: 0.7, a: 1.15, b: 0.9, c: 0.75,
  rotate: 0, float: 0, theme: "light",
};

const VIEWS = new Set<RenderView>(["solid", "solid-wireframe", "wireframe", "face", "face-context"]);
const PALETTES = new Set<PaletteName>(["aurora", "coral", "violet", "gold"]);
const SHAPE_IDS = new Set<string>(SHAPES.map(item => item.id));
const HEX = /^#[0-9a-f]{6}$/i;
const PREFIX = "np1_";

function tuple(options: WorkbenchOptions): unknown[] {
  return [options.shape, options.view, options.palette, options.color, options.background,
    options.yaw, options.pitch, options.rotation ?? null, options.zoom, options.faceIndex,
    options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c,
    options.rotate, options.float, options.theme];
}

function parseTuple(value: unknown, checkGeometry: boolean): WorkbenchOptions {
  if (!Array.isArray(value) || value.length !== 20) throw new Error("Design code has an invalid format");
  const [shape, view, palette, color, background, yaw, pitch, rotation, zoom, faceIndex,
    n, p, q, crownHeight, a, b, c, rotate, float, theme] = value as unknown[];
  const numberIn = (item: unknown, min: number, max: number): item is number =>
    typeof item === "number" && Number.isFinite(item) && item >= min && item <= max;
  const integerIn = (item: unknown, min: number, max: number): item is number =>
    numberIn(item, min, max) && Number.isInteger(item);
  if (typeof shape !== "string" || !SHAPE_IDS.has(shape)) throw new Error("Design code has an unknown form");
  if (!VIEWS.has(view as RenderView) || !PALETTES.has(palette as PaletteName)) throw new Error("Design code has an unknown view or palette");
  if (typeof color !== "string" || !HEX.test(color) || typeof background !== "string" || (background !== "transparent" && !HEX.test(background))) throw new Error("Design code has an invalid color");
  if (!numberIn(yaw, -Math.PI * 2, Math.PI * 2) || !numberIn(pitch, -Math.PI, Math.PI) || !numberIn(zoom, 0.4, 2.5)) throw new Error("Design code has an invalid camera");
  if (rotation !== null && (!Array.isArray(rotation) || rotation.length !== 4 || !rotation.every(item => numberIn(item, -1, 1)) || Math.abs(Math.hypot(...rotation) - 1) > 0.001)) throw new Error("Design code has an invalid rotation");
  if (!integerIn(faceIndex, 0, 100_000) || !integerIn(n, 3, 64) || !integerIn(p, 1, 63) || !integerIn(q, 1, 63)) throw new Error("Design code has invalid geometry parameters");
  if (!numberIn(crownHeight, 0.1, 2) || !numberIn(a, 0.1, 3) || !numberIn(b, 0.1, 3) || !numberIn(c, 0.1, 3)) throw new Error("Design code has invalid dimensions");
  if (!numberIn(rotate, 0, 1) || !numberIn(float, 0, 1) || (theme !== "light" && theme !== "dark")) throw new Error("Design code has invalid motion or theme");
  const options: WorkbenchOptions = {
    shape: shape as ShapeId, view: view as RenderView, palette: palette as PaletteName,
    color, background, yaw, pitch, rotation: rotation === null ? undefined : rotation as unknown as Quaternion,
    zoom, faceIndex, n, p, q, crownHeight, a, b, c, rotate, float, theme,
  };
  if (checkGeometry && faceIndex >= createPolyhedron(options).faces.length) throw new Error("Design code selects a face outside this form");
  return options;
}

/** Encode a complete visual state as a URL-safe, versioned string. */
export function optionsToString(options: WorkbenchOptions): string {
  const canonical = tuple(parseTuple(tuple(options), false));
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  return PREFIX + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode and validate a design code, including form-specific geometry. */
export function stringToOptions(code: string): WorkbenchOptions {
  if (!code.startsWith(PREFIX) || code.length > 4096) throw new Error("Unsupported design code");
  try {
    const encoded = code.slice(PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    return parseTuple(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), true);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Design code")) throw error;
    throw new Error("Design code could not be read");
  }
}
