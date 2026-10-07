import { FINITE_SPECS, generateFinite, KNOWN_FINITE_IDS } from "./finite.js";
import type { FiniteSpecId } from "./finite.js";

export { CATALOGUE_SOURCE, CATALOGUE_ID_CANDIDATES, KNOWN_FINITE_IDS } from "./finite.js";
export type Vec3 = readonly [number, number, number];
export type ShapeId =
  | "tetrahedron"
  | "cube"
  | "octahedron"
  | "dodecahedron"
  | "icosahedron"
  | "small-stellated-dodecahedron"
  | "great-dodecahedron"
  | "great-stellated-dodecahedron"
  | "great-icosahedron"
  | "disphenoid"
  | "stephanoid"
  | "antistephanoid"
  | FiniteSpecId;

export interface Polyhedron {
  readonly id: ShapeId;
  readonly name: string;
  readonly vertices: readonly Vec3[];
  /** Ordered abstract face cycles. These are not triangulated display meshes. */
  readonly faces: readonly (readonly number[])[];
  readonly edges: readonly (readonly [number, number])[];
  readonly family: "finite" | "disphenoid" | "stephanoid";
}

export interface ShapeOptions {
  shape?: ShapeId | "random";
  seed?: string | number;
  /** Stephanoid ring count. */
  n?: number;
  /** Stephanoid step parameters. */
  p?: number;
  q?: number;
  /** Half-height for stephanoids. */
  crownHeight?: number;
  /** Positive disphenoid axis lengths. */
  a?: number;
  b?: number;
  c?: number;
}

export const SHAPES: readonly { id: ShapeId; name: string; family: string }[] = [
  { id: "tetrahedron", name: "Tetrahedron", family: "Finite" },
  { id: "cube", name: "Cube", family: "Finite" },
  { id: "octahedron", name: "Octahedron", family: "Finite" },
  { id: "dodecahedron", name: "Dodecahedron", family: "Finite" },
  { id: "icosahedron", name: "Icosahedron", family: "Finite" },
  { id: "small-stellated-dodecahedron", name: "Small stellated dodecahedron", family: "Finite" },
  { id: "great-dodecahedron", name: "Great dodecahedron", family: "Finite" },
  { id: "great-stellated-dodecahedron", name: "Great stellated dodecahedron", family: "Finite" },
  { id: "great-icosahedron", name: "Great icosahedron", family: "Finite" },
  ...FINITE_SPECS.map(({ id, name }) => ({ id, name, family: "Finite" })),
  { id: "disphenoid", name: "Disphenoid", family: "Infinite family" },
  { id: "stephanoid", name: "Prismatic stephanoid", family: "Infinite family" },
  { id: "antistephanoid", name: "Antiprismatic stephanoid", family: "Infinite family" },
];

/** Known and constructible counts are intentionally separate while the catalogue grows. */
export const KNOWN_FINITE_COUNT = KNOWN_FINITE_IDS.length;
export const IMPLEMENTED_FINITE_COUNT = SHAPES.filter(shape => shape.family === "Finite").length;

export function hashSeed(seed: string | number): number {
  const value = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededDefaults(seed: string | number = "noble"): {
  shape: ShapeId;
  palette: "aurora" | "coral" | "violet" | "gold";
  yaw: number;
  pitch: number;
} {
  const hash = hashSeed(seed);
  const shapes = SHAPES.map(shape => shape.id);
  const palettes = ["aurora", "coral", "violet", "gold"] as const;
  return {
    shape: shapes[hash % shapes.length]!,
    palette: palettes[(hash >>> 4) % palettes.length]!,
    yaw: 0.25 + ((hash >>> 8) % 1000) / 1000 * 0.8,
    pitch: 0.55 + ((hash >>> 19) % 1000) / 1000 * 0.5,
  };
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v: Vec3): number => Math.hypot(...v);
const normalized = (v: Vec3): Vec3 => { const length = norm(v); return [v[0] / length, v[1] / length, v[2] / length]; };

function normalizeVertices(vertices: readonly Vec3[]): Vec3[] {
  const radius = Math.max(...vertices.map(norm));
  return vertices.map(v => [v[0] / radius, v[1] / radius, v[2] / radius]);
}

function complete(id: ShapeId, name: string, vertices: readonly Vec3[], faces: readonly (readonly number[])[], family: Polyhedron["family"]): Polyhedron {
  const edgeMap = new Map<string, readonly [number, number]>();
  for (const face of faces) {
    if (face.length < 3) throw new Error(`Invalid face in ${id}`);
    for (let i = 0; i < face.length; i++) {
      const a = face[i]!;
      const b = face[(i + 1) % face.length]!;
      if (a === b || a < 0 || b < 0 || a >= vertices.length || b >= vertices.length) throw new Error(`Invalid edge in ${id}`);
      const edge: readonly [number, number] = a < b ? [a, b] : [b, a];
      edgeMap.set(edge.join(":"), edge);
    }
  }
  return { id, name, vertices: normalizeVertices(vertices), faces, edges: [...edgeMap.values()], family };
}

/** Extract planar supporting faces from any small convex vertex orbit. */
function convexFaces(vertices: readonly Vec3[]): number[][] {
  const faceSets = new Map<string, number[]>();
  const epsilon = 1e-7;
  for (let a = 0; a < vertices.length; a++) for (let b = a + 1; b < vertices.length; b++) for (let c = b + 1; c < vertices.length; c++) {
    const normal = cross(sub(vertices[b]!, vertices[a]!), sub(vertices[c]!, vertices[a]!));
    if (norm(normal) < epsilon) continue;
    const distances = vertices.map(v => dot(normal, sub(v, vertices[a]!)));
    if (distances.some(d => d > epsilon) && distances.some(d => d < -epsilon)) continue;
    const indices = distances.flatMap((d, i) => Math.abs(d) <= epsilon ? [i] : []);
    faceSets.set(indices.join(":"), indices);
  }
  return [...faceSets.values()].map(indices => {
    const center = indices.reduce<Vec3>((sum, i) => add(sum, vertices[i]!), [0, 0, 0]);
    const centroid: Vec3 = [center[0] / indices.length, center[1] / indices.length, center[2] / indices.length];
    const u = normalized(sub(vertices[indices[0]!]!, centroid));
    let normal = normalized(cross(sub(vertices[indices[1]!]!, vertices[indices[0]!]!), sub(vertices[indices[2]!]!, vertices[indices[0]!]!)));
    if (dot(normal, centroid) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    const v = cross(normal, u);
    return indices.sort((i, j) => {
      const di = sub(vertices[i]!, centroid), dj = sub(vertices[j]!, centroid);
      return Math.atan2(dot(di, v), dot(di, u)) - Math.atan2(dot(dj, v), dot(dj, u));
    });
  });
}

function tetrahedron(): Polyhedron {
  const vertices: Vec3[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  return complete("tetrahedron", "Tetrahedron", vertices, convexFaces(vertices), "finite");
}

function cube(): Polyhedron {
  const vertices: Vec3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) vertices.push([x, y, z]);
  return complete("cube", "Cube", vertices, convexFaces(vertices), "finite");
}

function octahedron(): Polyhedron {
  const vertices: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  return complete("octahedron", "Octahedron", vertices, convexFaces(vertices), "finite");
}

function icosaVertices(): Vec3[] {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices: Vec3[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    vertices.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]);
  }
  return vertices;
}

function icosahedron(): Polyhedron {
  const vertices = icosaVertices();
  return complete("icosahedron", "Icosahedron", vertices, convexFaces(vertices), "finite");
}

/** Build five-vertex planar face orbits from distance layers about icosahedral axes. */
function pentagonalOrbitFaces(vertices: readonly Vec3[], poles: readonly Vec3[], layer: number, step: 1 | 2): number[][] {
  return poles.map(pole => {
    const levels: { height: number; indices: number[] }[] = [];
    vertices.forEach((vertex, index) => {
      const height = dot(vertex, pole);
      let level = levels.find(item => Math.abs(item.height - height) < 1e-7);
      if (!level) { level = { height, indices: [] }; levels.push(level); }
      level.indices.push(index);
    });
    levels.sort((a, b) => b.height - a.height);
    const ring = [...(levels[layer]?.indices ?? [])];
    if (ring.length !== 5) throw new Error("Expected a five-vertex orbit layer");
    const center = ring.reduce<Vec3>((sum, i) => add(sum, vertices[i]!), [0, 0, 0]);
    const centroid: Vec3 = [center[0] / 5, center[1] / 5, center[2] / 5];
    const u = normalized(sub(vertices[ring[0]!]!, centroid));
    const v = cross(normalized(pole), u);
    ring.sort((i, j) => {
      const di = sub(vertices[i]!, centroid), dj = sub(vertices[j]!, centroid);
      return Math.atan2(dot(di, v), dot(di, u)) - Math.atan2(dot(dj, v), dot(dj, u));
    });
    return [0, 1, 2, 3, 4].map(i => ring[(i * step) % 5]!);
  });
}

function dodecaVertices(): Vec3[] {
  const vertices = icosaVertices();
  return convexFaces(vertices).map(face => {
    const sum = face.reduce<Vec3>((acc, i) => add(acc, vertices[i]!), [0, 0, 0]);
    return [sum[0] / face.length, sum[1] / face.length, sum[2] / face.length];
  });
}

function dodecahedron(): Polyhedron {
  const vertices = dodecaVertices();
  return complete("dodecahedron", "Dodecahedron", vertices, convexFaces(vertices), "finite");
}

function smallStellatedDodecahedron(): Polyhedron {
  const vertices = icosaVertices();
  return complete("small-stellated-dodecahedron", "Small stellated dodecahedron", vertices, pentagonalOrbitFaces(vertices, vertices, 1, 2), "finite");
}

function greatDodecahedron(): Polyhedron {
  const vertices = icosaVertices();
  return complete("great-dodecahedron", "Great dodecahedron", vertices, pentagonalOrbitFaces(vertices, vertices, 1, 1), "finite");
}

function greatStellatedDodecahedron(): Polyhedron {
  const vertices = dodecaVertices();
  return complete("great-stellated-dodecahedron", "Great stellated dodecahedron", vertices, pentagonalOrbitFaces(vertices, icosaVertices(), 1, 2), "finite");
}

function greatIcosahedron(): Polyhedron {
  const vertices = icosaVertices();
  const triangles: { face: number[]; length: number }[] = [];
  for (let a = 0; a < vertices.length; a++) for (let b = a + 1; b < vertices.length; b++) for (let c = b + 1; c < vertices.length; c++) {
    const sides = [norm(sub(vertices[a]!, vertices[b]!)), norm(sub(vertices[b]!, vertices[c]!)), norm(sub(vertices[c]!, vertices[a]!))];
    if (Math.max(...sides) - Math.min(...sides) < 1e-7) triangles.push({ face: [a, b, c], length: sides[0]! });
  }
  const longest = Math.max(...triangles.map(item => item.length));
  const faces = triangles.filter(item => Math.abs(item.length - longest) < 1e-7).map(item => item.face);
  return complete("great-icosahedron", "Great icosahedron", vertices, faces, "finite");
}

function disphenoid(options: ShapeOptions): Polyhedron {
  const a = options.a ?? 1.15, b = options.b ?? 0.9, c = options.c ?? 0.75;
  if (![a, b, c].every(v => Number.isFinite(v) && v > 0)) throw new Error("Disphenoid axes must be positive finite numbers");
  const vertices: Vec3[] = [[a, b, c], [a, -b, -c], [-a, b, -c], [-a, -b, c]];
  return complete("disphenoid", "Disphenoid", vertices, convexFaces(vertices), "disphenoid");
}

const mod = (i: number, n: number): number => (i % n + n) % n;
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
function validInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
}

/** Hill §4.1: PC(n,p,q), generated by one quadrilateral and prism symmetry. */
function stephanoid(options: ShapeOptions): Polyhedron {
  const n = options.n ?? 5, p = options.p ?? 3, q = options.q ?? 1, h = options.crownHeight ?? 0.7;
  for (const [value, label] of [[n, "n"], [p, "p"], [q, "q"]] as const) validInteger(value, label);
  if (!(n >= 5 && 2 * p - n < 2 * q && 2 * q < p && p < n)) throw new Error("Prismatic stephanoid requires 2p − n < 2q < p < n and n ≥ 5");
  if (gcd(gcd(n, p), q) !== 1) throw new Error("n, p, and q must have no common factor; otherwise this is a compound");
  if (!(Number.isFinite(h) && h > 0)) throw new Error("Height must be positive");
  const vertices: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const angle = i * 2 * Math.PI / n;
    vertices.push([Math.cos(angle), Math.sin(angle), h]);
  }
  for (let i = 0; i < n; i++) {
    const angle = i * 2 * Math.PI / n;
    vertices.push([Math.cos(angle), Math.sin(angle), -h]);
  }
  const faces: number[][] = [];
  for (let k = 0; k < n; k++) {
    const a = (i: number) => mod(i + k, n);
    const b = (i: number) => n + mod(i + k, n);
    faces.push([a(0), b(q), a(p), b(p - q)]);
    faces.push([b(0), a(q), b(p), a(p - q)]);
  }
  return complete("stephanoid", "Prismatic stephanoid", vertices, faces, "stephanoid");
}

/** Hill §4.1: AC(n,p,q), an antiprismatic crown. */
function antistephanoid(options: ShapeOptions): Polyhedron {
  const n = options.n ?? 5, p = options.p ?? 2, q = options.q ?? 1, h = options.crownHeight ?? 0.7;
  for (const [value, label] of [[n, "n"], [p, "p"], [q, "q"]] as const) validInteger(value, label);
  if (!(n >= 4 && q % 2 === 1 && 2 * p - n < q && q < p && p < n)) throw new Error("Antiprismatic stephanoid requires odd q and 2p − n < q < p < n");
  if (gcd(gcd(n, p), q) !== 1) throw new Error("n, p, and q must have no common factor; otherwise this is a compound");
  if (!(Number.isFinite(h) && h > 0)) throw new Error("Height must be positive");
  const vertices: Vec3[] = [];
  for (let i = 0; i < 2 * n; i++) {
    const angle = i * Math.PI / n;
    vertices.push([Math.cos(angle), Math.sin(angle), i % 2 === 0 ? h : -h]);
  }
  const faces: number[][] = [];
  for (let k = 0; k < 2 * n; k++) faces.push([0, q, 2 * p, 2 * p - q].map(i => mod(i + k, 2 * n)));
  return complete("antistephanoid", "Antiprismatic stephanoid", vertices, faces, "stephanoid");
}

export function createPolyhedron(options: ShapeOptions = {}): Polyhedron {
  const shape = options.shape && options.shape !== "random" ? options.shape : seededDefaults(options.seed).shape;
  switch (shape) {
    case "tetrahedron": return tetrahedron();
    case "cube": return cube();
    case "octahedron": return octahedron();
    case "dodecahedron": return dodecahedron();
    case "icosahedron": return icosahedron();
    case "small-stellated-dodecahedron": return smallStellatedDodecahedron();
    case "great-dodecahedron": return greatDodecahedron();
    case "great-stellated-dodecahedron": return greatStellatedDodecahedron();
    case "great-icosahedron": return greatIcosahedron();
    case "disphenoid": return disphenoid(options);
    case "stephanoid": return stephanoid(options);
    case "antistephanoid": return antistephanoid(options);
    default: {
      const specification = FINITE_SPECS.find(item => item.id === shape);
      if (!specification) throw new Error(`Unknown shape: ${String(shape)}`);
      const geometry = generateFinite(specification);
      return complete(specification.id, specification.name, geometry.vertices, geometry.faces, "finite");
    }
  }
}
