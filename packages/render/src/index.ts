import { createPolyhedron, seededDefaults, type Polyhedron, type ShapeOptions, type Vec3 } from "@noble-polyhedra/core";
import { PALETTES } from "./palettes.js";
import { resolveSceneOptions } from "./random-options.js";

export type PaletteName = "aurora" | "coral" | "violet" | "gold";
export type RenderView = "solid" | "solid-wireframe" | "wireframe" | "face" | "face-context";
/** Quaternion in [x, y, z, w] order. Overrides yaw and pitch when provided. */
export type Quaternion = readonly [number, number, number, number];
export interface RenderOptions {
  /** A true or empty random value draws a fresh design; a string is a stable seed. */
  random?: string | boolean;
  width?: number;
  height?: number;
  palette?: PaletteName;
  color?: string;
  /** Six-digit hex color, or "transparent" for an alpha background. */
  background?: string;
  yaw?: number;
  pitch?: number;
  rotation?: Quaternion;
  zoom?: number;
  edgeWidth?: number;
  /** Shaded mesh, full wireframe, or one repeated face. */
  view?: RenderView;
  /** Select one of the congruent faces for the face study views. */
  faceIndex?: number;
  /** Internal supersampling. The web component uses 2 at rest and during motion. */
  quality?: 1 | 2;
}
export type SceneOptions = ShapeOptions & RenderOptions;
export interface RenderedImage { width: number; height: number; data: Uint8ClampedArray }

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];
export { PALETTES } from "./palettes.js";
export { randomOptions, randomSeed, resolveSceneOptions } from "./random-options.js";

type RGB = readonly [number, number, number];
type Point = { x: number; y: number; z: number };
const clamp = (value: number, low = 0, high = 1): number => Math.max(low, Math.min(high, value));

function parseHex(value: string): RGB {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Expected a six-digit hex color, got ${value}`);
  const hex = match[1]!;
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as unknown as RGB;
}

export function rotateVertex(v: Vec3, yaw: number, pitch: number, quaternion?: Quaternion): Vec3 {
  if (quaternion) {
    const [qx, qy, qz, qw] = quaternion;
    const ix = qw * v[0] + qy * v[2] - qz * v[1];
    const iy = qw * v[1] + qz * v[0] - qx * v[2];
    const iz = qw * v[2] + qx * v[1] - qy * v[0];
    const iw = -qx * v[0] - qy * v[1] - qz * v[2];
    return [ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx];
  }
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = v[0] * cy + v[2] * sy;
  const z = -v[0] * sy + v[2] * cy;
  return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
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

function put(data: Uint8ClampedArray, index: number, color: RGB, alpha = 255): void {
  data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = alpha;
}

/** Shared, dependency-free orthographic rasterizer with a per-pixel depth buffer. */
export function renderPolyhedron(polyhedron: Polyhedron, options: RenderOptions = {}): RenderedImage {
  const width = Math.round(options.width ?? 512), height = Math.round(options.height ?? 512);
  if (!(width > 0 && height > 0 && width <= 8192 && height <= 8192)) throw new Error("Image dimensions must be 1–8192 pixels");
  const quality = options.quality ?? 2;
  if (width * height * quality * quality > 64_000_000) throw new Error("Image size exceeds the renderer's pixel budget");
  const w = width * quality, h = height * quality;
  const palette = PALETTES[options.palette ?? "aurora"];
  if (!palette) throw new Error(`Unknown palette: ${options.palette}`);
  const base = parseHex(options.color ?? palette.color);
  const transparent = options.background === "transparent";
  const background = transparent ? undefined : parseHex(options.background ?? palette.background);
  const view: RenderView = options.view ?? "solid-wireframe";
  if (!["solid", "solid-wireframe", "wireframe", "face", "face-context"].includes(view)) throw new Error(`Unknown render view: ${view}`);
  const yaw = options.yaw ?? 0.55, pitch = options.pitch ?? (view === "face" ? 0 : 0.72);
  const rotation = options.rotation;
  if (rotation && (rotation.length !== 4 || rotation.some(value => !Number.isFinite(value)) || Math.abs(Math.hypot(...rotation) - 1) > 0.01)) throw new Error("Rotation must be a unit quaternion [x, y, z, w]");
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
    transformed = local.map(point => rotateVertex(point, yaw, pitch, rotation));
  } else transformed = polyhedron.vertices.map(v => rotateVertex(v, yaw, pitch, rotation));
  const points: Point[] = transformed.map(v => ({ x: w / 2 + v[0] * radius, y: h / 2 - v[1] * radius, z: v[2] }));
  const data = new Uint8ClampedArray(w * h * 4);
  const depth = new Float32Array(w * h);
  depth.fill(-Infinity);

  if (background) {
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
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      const intersections: number[] = [];
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const p0 = polygon[j]!, p1 = polygon[i]!;
        if ((p0.y > py) !== (p1.y > py)) intersections.push(p0.x + (p1.x - p0.x) * (py - p0.y) / (p1.y - p0.y));
      }
      intersections.sort((left, right) => left - right);
      const worldY = -(py - h / 2) / radius;
      for (let span = 0; span + 1 < intersections.length; span += 2) {
        const startX = Math.max(minX, Math.ceil(intersections[span]! - 0.5));
        const endX = Math.min(maxX, Math.ceil(intersections[span + 1]! - 0.5) - 1);
        for (let x = startX; x <= endX; x++) {
          const worldX = (x + 0.5 - w / 2) / radius;
          const z = (planeD - normal[0] * worldX - normal[1] * worldY) / normal[2];
          const index = y * w + x;
          if (z > depth[index]! + 1e-5) { depth[index] = z; put(data, index * 4, color); }
        }
      }
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
    const paint = (x: number, y: number): void => {
      const t = clamp(((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / lengthSquared);
      const distance = Math.hypot(x + 0.5 - (a.x + t * dx), y + 0.5 - (a.y + t * dy));
      const coverage = clamp(edgeRadius + 0.5 - distance);
      if (coverage <= 0) return;
      const index = y * w + x;
      const z = a.z + t * (b.z - a.z);
      if (testDepth && z + 0.008 < depth[index]!) return;
      const offset = index * 4;
      const alpha = coverage * opacity;
      const underlyingAlpha = data[offset + 3]! / 255;
      const outputAlpha = alpha + underlyingAlpha * (1 - alpha);
      const underlying: RGB = [data[offset]!, data[offset + 1]!, data[offset + 2]!];
      put(data, offset, [
        (underlying[0] * underlyingAlpha * (1 - alpha) + edgeColor[0] * alpha) / outputAlpha,
        (underlying[1] * underlyingAlpha * (1 - alpha) + edgeColor[1] * alpha) / outputAlpha,
        (underlying[2] * underlyingAlpha * (1 - alpha) + edgeColor[2] * alpha) / outputAlpha,
      ], outputAlpha * 255);
    };
    // Visit only a narrow strip around the segment, including rounded caps.
    // The coverage and depth formulas stay identical to the full box traversal.
    const band = Math.ceil((edgeRadius + 0.5) * Math.SQRT2 + 1);
    if (Math.abs(dx) >= Math.abs(dy)) {
      for (let x = minX; x <= maxX; x++) {
        const t = clamp((x + 0.5 - a.x) / dx);
        const centerY = a.y + t * dy;
        for (let y = Math.max(minY, Math.floor(centerY - band)); y <= Math.min(maxY, Math.ceil(centerY + band)); y++) paint(x, y);
      }
    } else {
      for (let y = minY; y <= maxY; y++) {
        const t = clamp((y + 0.5 - a.y) / dy);
        const centerX = a.x + t * dx;
        for (let x = Math.max(minX, Math.floor(centerX - band)); x <= Math.min(maxX, Math.ceil(centerX + band)); x++) paint(x, y);
      }
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
    let alphaSum = 0;
    const colorSum = [0, 0, 0];
    for (let sy = 0; sy < quality; sy++) for (let sx = 0; sx < quality; sx++) {
      const source = ((y * quality + sy) * w + x * quality + sx) * 4;
      const alpha = data[source + 3]!;
      alphaSum += alpha;
      for (let channel = 0; channel < 3; channel++) colorSum[channel]! += data[source + channel]! * alpha;
    }
    for (let channel = 0; channel < 3; channel++) reduced[out + channel] = alphaSum ? colorSum[channel]! / alphaSum : 0;
    reduced[out + 3] = alphaSum / (quality * quality);
  }
  return { width, height, data: reduced };
}

export { optionsToString, stringToOptions, DEFAULT_DESIGN_OPTIONS, DEFAULT_WORKBENCH_OPTIONS, type DesignOptions, type WorkbenchOptions } from "./options-code.js";

export function renderScene(options: SceneOptions = {}): RenderedImage {
  const resolved = resolveSceneOptions(options);
  const defaults = seededDefaults(resolved.seed);
  const polyhedron = createPolyhedron(resolved);
  return renderPolyhedron(polyhedron, {
    ...resolved,
    palette: resolved.palette ?? defaults.palette,
    yaw: resolved.yaw ?? defaults.yaw,
    pitch: resolved.pitch ?? (resolved.view === "face" ? 0 : defaults.pitch),
  });
}
