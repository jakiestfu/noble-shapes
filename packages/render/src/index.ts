import { createPolyhedron, seededDefaults, type Polyhedron, type ShapeOptions, type Vec3 } from "@noble-polyhedra/core";

export type PaletteName = "aurora" | "coral" | "violet" | "gold";
export type RenderView = "solid" | "solid-wireframe" | "wireframe" | "face" | "face-context";
export interface RenderOptions {
  width?: number;
  height?: number;
  palette?: PaletteName;
  color?: string;
  background?: string;
  yaw?: number;
  pitch?: number;
  zoom?: number;
  edgeWidth?: number;
  /** Shaded mesh, full wireframe, or one repeated face. */
  view?: RenderView;
  /** Select one of the congruent faces for the face study views. */
  faceIndex?: number;
  /** Internal supersampling. 1 is useful during pointer interaction; 2 is the default. */
  quality?: 1 | 2;
}
export type SceneOptions = ShapeOptions & RenderOptions;
export interface RenderedImage { width: number; height: number; data: Uint8ClampedArray }

const PALETTES: Record<PaletteName, { color: string; background: string }> = {
  aurora: { color: "#5ce0d3", background: "#07131d" },
  coral: { color: "#ffad8c", background: "#21101b" },
  violet: { color: "#c0adff", background: "#131025" },
  gold: { color: "#ffce83", background: "#20150d" },
};
export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

type RGB = readonly [number, number, number];
type Point = { x: number; y: number; z: number };
const clamp = (value: number, low = 0, high = 1): number => Math.max(low, Math.min(high, value));

function parseHex(value: string): RGB {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Expected a six-digit hex color, got ${value}`);
  const hex = match[1]!;
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as unknown as RGB;
}

function rotate(v: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = v[0] * cy - v[1] * sy;
  const y = v[0] * sy + v[1] * cy;
  return [x, y * cp - v[2] * sp, y * sp + v[2] * cp];
}

function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };

function insideEvenOdd(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function put(data: Uint8ClampedArray, index: number, color: RGB, alpha = 255): void {
  data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = alpha;
}

/** Shared, dependency-free orthographic rasterizer with a per-pixel depth buffer. */
export function renderPolyhedron(polyhedron: Polyhedron, options: RenderOptions = {}): RenderedImage {
  const width = Math.round(options.width ?? 512), height = Math.round(options.height ?? 512);
  if (!(width > 0 && height > 0 && width <= 4096 && height <= 4096)) throw new Error("Image dimensions must be 1–4096 pixels");
  const quality = options.quality ?? 2;
  if (width * height * quality * quality > 16_000_000) throw new Error("Image size exceeds the renderer's pixel budget");
  const w = width * quality, h = height * quality;
  const palette = PALETTES[options.palette ?? "aurora"];
  if (!palette) throw new Error(`Unknown palette: ${options.palette}`);
  const base = parseHex(options.color ?? palette.color);
  const background = parseHex(options.background ?? palette.background);
  const view: RenderView = options.view ?? "solid-wireframe";
  if (!["solid", "solid-wireframe", "wireframe", "face", "face-context"].includes(view)) throw new Error(`Unknown render view: ${view}`);
  const yaw = options.yaw ?? 0.55, pitch = options.pitch ?? (view === "face" ? 0 : 0.72);
  const zoom = options.zoom ?? 1;
  if (!(Number.isFinite(zoom) && zoom > 0 && zoom <= 4)) throw new Error("Zoom must be between 0 and 4");
  const faceIndex = options.faceIndex ?? 0;
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= polyhedron.faces.length) throw new Error("Face index is outside this shape's face range");
  let radius = Math.min(w, h) * 0.37 * zoom;
  let transformed: Vec3[];
  if (view === "face") {
    const face = polyhedron.faces[faceIndex]!;
    const sum = face.reduce<Vec3>((acc, i) => [acc[0] + polyhedron.vertices[i]![0], acc[1] + polyhedron.vertices[i]![1], acc[2] + polyhedron.vertices[i]![2]], [0, 0, 0]);
    const center: Vec3 = [sum[0] / face.length, sum[1] / face.length, sum[2] / face.length];
    const a = polyhedron.vertices[face[0]!]!, b = polyhedron.vertices[face[1]!]!, c = polyhedron.vertices[face[2]!]!;
    const normal = faceNormal(a, b, c);
    const u = unit(subtract(a, center));
    const v = cross(normal, u);
    const local = polyhedron.vertices.map(point => {
      const delta = subtract(point, center);
      return [dot(delta, u), dot(delta, v), dot(delta, normal)] as Vec3;
    });
    const faceRadius = Math.max(...face.map(i => Math.hypot(local[i]![0], local[i]![1])));
    radius = Math.min(w, h) * 0.38 * zoom / faceRadius;
    transformed = local.map(point => rotate(point, yaw, pitch));
  } else transformed = polyhedron.vertices.map(v => rotate(v, yaw, pitch));
  const points: Point[] = transformed.map(v => ({ x: w / 2 + v[0] * radius, y: h / 2 - v[1] * radius, z: v[2] }));
  const data = new Uint8ClampedArray(w * h * 4);
  const depth = new Float32Array(w * h);
  depth.fill(-Infinity);

  // Quiet vignette and a soft halo keep a small embedded image legible on many pages.
  const glow = Math.min(w, h) * 0.58;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w / 2, dy = y - h / 2;
    const halo = Math.exp(-(dx * dx + dy * dy) / (glow * glow)) * 0.14;
    const vignette = clamp(1 - Math.hypot(dx / w, dy / h) * 0.34, 0.72, 1);
    const i = (y * w + x) * 4;
    put(data, i, [
      Math.round((background[0] + base[0] * halo) * vignette),
      Math.round((background[1] + base[1] * halo) * vignette),
      Math.round((background[2] + base[2] * halo) * vignette),
    ]);
  }

  for (let drawnFace = 0; drawnFace < polyhedron.faces.length; drawnFace++) {
    if (view === "wireframe" || ((view === "face" || view === "face-context") && drawnFace !== faceIndex)) continue;
    const face = polyhedron.faces[drawnFace]!;
    const polygon = face.map(i => points[i]!);
    const a = transformed[face[0]!]!, b = transformed[face[1]!]!, c = transformed[face[2]!]!;
    const normal = faceNormal(a, b, c);
    if (Math.abs(normal[2]) < 1e-7) continue;
    const planeD = normal[0] * a[0] + normal[1] * a[1] + normal[2] * a[2];
    const key = Math.abs(normal[0] * -0.42 + normal[1] * 0.55 + normal[2] * 0.72);
    const fill = view === "face" || view === "face-context" ? 0.88 + key * 0.12 : 0.42 + key * 0.47 + Math.pow(1 - Math.abs(normal[2]), 2) * 0.1;
    const variation = view === "face" || view === "face-context" ? 1 : 0.96 + ((drawnFace * 73) % 11) / 135;
    const highlight = Math.pow(key, 8) * 0.15;
    const color: RGB = [0, 1, 2].map(channel => clamp(base[channel]! * fill * variation + (255 - base[channel]!) * highlight, 0, 255)) as unknown as RGB;
    const minX = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.x))));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(...polygon.map(p => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.y))));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(...polygon.map(p => p.y))));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!insideEvenOdd(px, py, polygon)) continue;
      const worldX = (px - w / 2) / radius;
      const worldY = -(py - h / 2) / radius;
      const z = (planeD - normal[0] * worldX - normal[1] * worldY) / normal[2];
      const index = y * w + x;
      if (z > depth[index]! + 1e-5) { depth[index] = z; put(data, index * 4, color); }
    }
  }

  const edgeRadius = Math.max(0.65, (options.edgeWidth ?? (view === "wireframe" || view === "face-context" ? 1.3 : 1.0)) * quality / 2);
  const edgeColor: RGB = [0, 1, 2].map(i => clamp(base[i]! * (view === "solid-wireframe" ? 0.55 : 0.65) + (view === "solid-wireframe" ? 95 : 115), 0, 255)) as unknown as RGB;
  const drawEdge = (ia: number, ib: number, opacity: number, testDepth: boolean): void => {
    const a = points[ia]!, b = points[ib]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 1e-8) return;
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x) - edgeRadius - 1));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x) + edgeRadius + 1));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y) - edgeRadius - 1));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y) + edgeRadius + 1));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const t = clamp(((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / lengthSquared);
      const distance = Math.hypot(x + 0.5 - (a.x + t * dx), y + 0.5 - (a.y + t * dy));
      const coverage = clamp(edgeRadius + 0.5 - distance);
      if (coverage <= 0) continue;
      const index = y * w + x;
      const z = a.z + t * (b.z - a.z);
      if (testDepth && z + 0.008 < depth[index]!) continue;
      const offset = index * 4;
      const underlying: RGB = [data[offset]!, data[offset + 1]!, data[offset + 2]!];
      const alpha = coverage * opacity;
      put(data, offset, [
        underlying[0] * (1 - alpha) + edgeColor[0] * alpha,
        underlying[1] * (1 - alpha) + edgeColor[1] * alpha,
        underlying[2] * (1 - alpha) + edgeColor[2] * alpha,
      ]);
    }
  };
  if (view === "solid-wireframe") for (const [ia, ib] of polyhedron.edges) drawEdge(ia, ib, 1, true);
  if (view === "wireframe") for (const [ia, ib] of polyhedron.edges) drawEdge(ia, ib, 0.8, false);
  if (view === "face-context") for (const [ia, ib] of polyhedron.edges) drawEdge(ia, ib, 0.42, false);
  if (view === "face" || view === "face-context") {
    const face = polyhedron.faces[faceIndex]!;
    for (let i = 0; i < face.length; i++) drawEdge(face[i]!, face[(i + 1) % face.length]!, 1, false);
  }

  if (quality === 1) return { width, height, data };
  const reduced = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const out = (y * width + x) * 4;
    for (let channel = 0; channel < 4; channel++) {
      let sum = 0;
      for (let sy = 0; sy < quality; sy++) for (let sx = 0; sx < quality; sx++) sum += data[((y * quality + sy) * w + x * quality + sx) * 4 + channel]!;
      reduced[out + channel] = sum / (quality * quality);
    }
  }
  return { width, height, data: reduced };
}

export function renderScene(options: SceneOptions = {}): RenderedImage {
  const defaults = seededDefaults(options.seed);
  const polyhedron = createPolyhedron(options);
  return renderPolyhedron(polyhedron, {
    ...options,
    palette: options.palette ?? defaults.palette,
    yaw: options.yaw ?? defaults.yaw,
    pitch: options.pitch ?? (options.view === "face" ? 0 : defaults.pitch),
  });
}
