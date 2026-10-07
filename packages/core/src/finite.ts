import type { Vec3 } from "./index.js";

/**
 * The finite orbit construction follows Hill, §§3.1–3.2 and Appendix A–B:
 * https://arxiv.org/pdf/2607.28711
 *
 * Each entry stores one generating point and one abstract face cycle. The
 * reflection group generates every vertex and face. Face cycles below were
 * independently recovered by enumerating coplanar vertex sets, their plane
 * adjacency graphs, and connected vertex figures; no model files are used.
 */

type OrbitGroup = "octahedral" | "icosahedral";
type Symmetry = "full" | "rotational";
type Matrix = readonly [number, number, number, number, number, number, number, number, number];

export interface FiniteSpec {
  readonly id: string;
  readonly name: string;
  readonly orbitGroup: OrbitGroup;
  readonly parameters: readonly [number, number, number];
  readonly seedFace: readonly number[];
  readonly symmetry: Symmetry;
  readonly vertexSymmetry?: Symmetry;
  readonly expected: readonly [vertices: number, edges: number, faces: number];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const ICOSAHEDRAL_GENERATORS: readonly Matrix[] = [
  [-1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, -1, 0, 0, 0, 1],
  [(1 - PHI) / 2, -PHI / 2, 1 / 2, -PHI / 2, 1 / 2, (PHI - 1) / 2, 1 / 2, (PHI - 1) / 2, PHI / 2],
];
const OCTAHEDRAL_GENERATORS: readonly Matrix[] = [
  [-1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1, 0],
];
const IDENTITY: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function multiply(a: Matrix, b: Matrix): Matrix {
  const out: number[] = [];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    let value = 0;
    for (let k = 0; k < 3; k++) value += a[row * 3 + k]! * b[k * 3 + column]!;
    out.push(value);
  }
  return out as unknown as Matrix;
}

function apply(matrix: Matrix, point: Vec3): Vec3 {
  return [
    matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2],
    matrix[3] * point[0] + matrix[4] * point[1] + matrix[5] * point[2],
    matrix[6] * point[0] + matrix[7] * point[1] + matrix[8] * point[2],
  ];
}

const quantized = (value: number, digits: number): string =>
  (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
const matrixKey = (matrix: Matrix): string => matrix.map(value => quantized(value, 8)).join(",");
const pointKey = (point: Vec3): string => point.map(value => quantized(value, 7)).join(",");

function groupClosure(generators: readonly Matrix[]): Matrix[] {
  const matrices: Matrix[] = [IDENTITY];
  const seen = new Set([matrixKey(IDENTITY)]);
  for (let index = 0; index < matrices.length; index++) {
    for (const generator of generators) {
      const matrix = multiply(generator, matrices[index]!);
      const key = matrixKey(matrix);
      if (!seen.has(key)) { seen.add(key); matrices.push(matrix); }
    }
  }
  return matrices;
}

function determinant(m: Matrix): number {
  return m[0] * (m[4] * m[8] - m[5] * m[7])
    - m[1] * (m[3] * m[8] - m[5] * m[6])
    + m[2] * (m[3] * m[7] - m[4] * m[6]);
}

const GROUPS: Partial<Record<OrbitGroup, Matrix[]>> = {};
function matricesFor(group: OrbitGroup): readonly Matrix[] {
  return GROUPS[group] ??= groupClosure(group === "icosahedral" ? ICOSAHEDRAL_GENERATORS : OCTAHEDRAL_GENERATORS);
}

/** Mirror-distance parameters (a,b,c), as defined in Hill's Table 1. */
function generatingPoint(group: OrbitGroup, [a, b, c]: readonly [number, number, number]): Vec3 {
  if (group === "icosahedral") return [a, b, PHI * PHI * a + PHI * b + 2 * PHI * c];
  const sqrt2 = Math.sqrt(2);
  return [a, a + sqrt2 * b, a + sqrt2 * (b + c)];
}

function vertexOrbit(matrices: readonly Matrix[], point: Vec3): Vec3[] {
  const vertices: Vec3[] = [];
  const seen = new Set<string>();
  for (const matrix of matrices) {
    const vertex = apply(matrix, point);
    const key = pointKey(vertex);
    if (!seen.has(key)) { seen.add(key); vertices.push(vertex); }
  }
  return vertices;
}

function canonicalCycle(face: readonly number[]): number[] {
  let best: number[] | undefined;
  for (const source of [face, [...face].reverse()]) for (let offset = 0; offset < face.length; offset++) {
    const candidate = [...source.slice(offset), ...source.slice(0, offset)];
    if (!best) { best = candidate; continue; }
    for (let index = 0; index < face.length; index++) {
      if (candidate[index] === best[index]) continue;
      if (candidate[index]! < best[index]!) best = candidate;
      break;
    }
  }
  return best!;
}

/** Orbit and symmetry permutations for independently checking catalogue seeds. */
export function finiteOrbitData(spec: FiniteSpec): { vertices: Vec3[]; permutations: number[][] } {
  const allMatrices = matricesFor(spec.orbitGroup);
  const faceMatrices = spec.symmetry === "rotational"
    ? allMatrices.filter(matrix => determinant(matrix) > 0) : allMatrices;
  const vertexMatrices = spec.vertexSymmetry === "rotational" ? faceMatrices : allMatrices;
  const vertices = vertexOrbit(vertexMatrices, generatingPoint(spec.orbitGroup, spec.parameters));
  const indexByPoint = new Map(vertices.map((vertex, index) => [pointKey(vertex), index]));
  const permutations = faceMatrices.map(matrix => vertices.map(vertex => {
    const mapped = indexByPoint.get(pointKey(apply(matrix, vertex)));
    if (mapped === undefined) throw new Error(`Orbit permutation failed for ${spec.id}`);
    return mapped;
  }));
  return { vertices, permutations };
}

/** Generate the entire orbit of one planar polygon under the prescribed group. */
export function generateFinite(spec: FiniteSpec): { vertices: Vec3[]; faces: number[][] } {
  const allMatrices = matricesFor(spec.orbitGroup);
  const symmetryMatrices = spec.symmetry === "rotational"
    ? allMatrices.filter(matrix => determinant(matrix) > 0)
    : allMatrices;
  const vertexMatrices = spec.vertexSymmetry === "rotational" ? symmetryMatrices : allMatrices;
  const vertices = vertexOrbit(vertexMatrices, generatingPoint(spec.orbitGroup, spec.parameters));
  if (vertices.length !== spec.expected[0]) throw new Error(`Unexpected vertex orbit for ${spec.id}`);
  const indexByPoint = new Map(vertices.map((vertex, index) => [pointKey(vertex), index]));
  const faces = new Map<string, number[]>();
  for (const matrix of symmetryMatrices) {
    const face = canonicalCycle(spec.seedFace.map(index => {
      const mapped = indexByPoint.get(pointKey(apply(matrix, vertices[index]!)));
      if (mapped === undefined) throw new Error(`Orbit permutation failed for ${spec.id}`);
      return mapped;
    }));
    faces.set(face.join(":"), face);
  }
  if (faces.size !== spec.expected[2]) throw new Error(`Unexpected face orbit for ${spec.id}`);
  return { vertices, faces: [...faces.values()] };
}

// The first eleven entries complete the 20 fixed-orbit forms when combined
// with the nine named Platonic and Kepler–Poinsot forms in index.ts.
const FIXED_AND_CUBIC_SPECS = [
  { id: "ID-1", name: "Icosahedral faceting ID-1", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 9, 1, 13], symmetry: "full", expected: [30, 120, 60] },
  { id: "ID-2", name: "Icosahedral faceting ID-2", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 6, 16], symmetry: "full", expected: [30, 180, 120] },
  { id: "ID-3", name: "Icosahedral faceting ID-3", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 17, 1, 20], symmetry: "full", expected: [30, 120, 60] },
  { id: "ID-4", name: "Icosahedral faceting ID-4", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 6, 17], symmetry: "full", expected: [30, 180, 120] },
  { id: "ID-5", name: "Icosahedral faceting ID-5", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 16, 5, 24], symmetry: "full", expected: [30, 120, 60] },
  { id: "ID-6", name: "Icosahedral faceting ID-6", orbitGroup: "icosahedral", parameters: [0, 0, 1], seedFace: [0, 13, 23], symmetry: "full", expected: [30, 180, 120] },
  { id: "D-2", name: "Dodecahedral faceting D-2", orbitGroup: "icosahedral", parameters: [1, 0, 0], seedFace: [0, 1, 12], symmetry: "full", expected: [20, 90, 60] },
  { id: "D-3", name: "Dodecahedral faceting D-3", orbitGroup: "icosahedral", parameters: [1, 0, 0], seedFace: [0, 1, 13, 7, 9, 15], symmetry: "full", expected: [20, 60, 20] },
  { id: "D-4", name: "Dodecahedral faceting D-4", orbitGroup: "icosahedral", parameters: [1, 0, 0], seedFace: [0, 1, 7, 9], symmetry: "full", expected: [20, 120, 60] },
  { id: "D-5", name: "Dodecahedral faceting D-5", orbitGroup: "icosahedral", parameters: [1, 0, 0], seedFace: [0, 1, 13], symmetry: "rotational", expected: [20, 90, 60] },
  { id: "D-7", name: "Dodecahedral faceting D-7", orbitGroup: "icosahedral", parameters: [1, 0, 0], seedFace: [0, 9, 16], symmetry: "full", expected: [20, 90, 60] },
  { id: "tO-1.1", name: "Octahedral faceting tO-1.1", orbitGroup: "octahedral", parameters: [0, 2.14789903570479, 1], seedFace: [0, 10, 22, 15], symmetry: "full", expected: [24, 96, 48] },
  { id: "tC-1.1", name: "Cubic faceting tC-1.1", orbitGroup: "octahedral", parameters: [1, 1, 0], seedFace: [0, 19, 14, 10, 21], symmetry: "full", expected: [24, 60, 24] },
  { id: "rC-1.1", name: "Cubic faceting rC-1.1", orbitGroup: "octahedral", parameters: [1, 0, 1], seedFace: [0, 8, 19, 9, 18], symmetry: "full", expected: [24, 60, 24] },
] as const satisfies readonly FiniteSpec[];

type OneParameterOrbit = "tI" | "tD" | "rD";
interface OneParameterRow {
  readonly id: string;
  readonly orbit: OneParameterOrbit;
  readonly parameter: number;
  readonly seedFace: readonly number[];
  readonly symmetry: Symmetry;
  readonly edges: number;
  readonly faces: number;
}

/** Approximate roots in Hill's Table 10, then independently recovered faces. */
const ONE_PARAMETER_DATA = [
  { id: "tI-1.1", orbit: "tI", parameter: 0.25599806014774, seedFace: [0, 12, 51, 2, 8, 55], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-1.2", orbit: "tI", parameter: 0.25599806014774, seedFace: [0, 12, 51, 2, 55], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "tI-2.1", orbit: "tI", parameter: 0.27201964951406, seedFace: [0, 3, 44, 40, 26, 8], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-2.2", orbit: "tI", parameter: 0.27201964951406, seedFace: [0, 12, 49, 2, 8, 53], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-3.1", orbit: "tI", parameter: 0.61803398874989, seedFace: [0, 27, 3, 10, 47, 26, 49, 40], symmetry: "full", edges: 120, faces: 30 },
  { id: "tI-3.2", orbit: "tI", parameter: 0.61803398874989, seedFace: [0, 1, 41, 31, 25, 47], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-4.1", orbit: "tI", parameter: 0.86676039917386, seedFace: [0, 3, 39, 54, 6, 33], symmetry: "rotational", edges: 180, faces: 60 },
  { id: "tI-4.2", orbit: "tI", parameter: 0.86676039917386, seedFace: [0, 1, 50, 25, 31, 55], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-5.1", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 2, 25, 11, 43, 36, 6, 18], symmetry: "full", edges: 120, faces: 30 },
  { id: "tI-5.2", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 27, 55, 2, 33, 51], symmetry: "full", edges: 180, faces: 60 },
  { id: "tI-5-pentagon-a", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 27, 33, 2, 51], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "tI-5-pentagon-b", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 27, 55, 2, 51], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "tI-5-pentagon-c", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 51, 33, 27, 55], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "tI-5-hexagon-chiral", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 27, 33, 51, 2, 55], symmetry: "rotational", edges: 180, faces: 60 },
  { id: "tI-5.7", orbit: "tI", parameter: 1.61803398874989, seedFace: [0, 55, 6, 40, 32, 26, 45, 3, 57], symmetry: "full", edges: 90, faces: 20 },
  { id: "tI-6.1", orbit: "tI", parameter: 2.61803398874989, seedFace: [0, 18, 45, 3, 57], symmetry: "full", edges: 150, faces: 60 },
  { id: "tI-7.1", orbit: "tI", parameter: 3.02048177471563, seedFace: [0, 27, 33, 2, 47], symmetry: "full", edges: 150, faces: 60 },

  { id: "tD-1.1", orbit: "tD", parameter: 0.53568738679187, seedFace: [0, 1, 50, 32, 26, 54], symmetry: "full", edges: 180, faces: 60 },
  { id: "tD-1.2", orbit: "tD", parameter: 0.53568738679187, seedFace: [0, 12, 35, 2, 8, 52], symmetry: "rotational", edges: 180, faces: 60 },
  { id: "tD-2.1", orbit: "tD", parameter: 1.0, seedFace: [0, 48, 20, 58, 3, 51], symmetry: "full", edges: 180, faces: 60 },
  { id: "tD-3.1", orbit: "tD", parameter: 1.27201964951407, seedFace: [0, 12, 36, 2, 8, 43], symmetry: "full", edges: 180, faces: 60 },
  { id: "tD-3.2", orbit: "tD", parameter: 1.27201964951407, seedFace: [0, 20, 49, 2, 26, 53], symmetry: "full", edges: 180, faces: 60 },
  { id: "tD-4.1", orbit: "tD", parameter: 2.61803398874989, seedFace: [0, 27, 33, 2, 54], symmetry: "full", edges: 150, faces: 60 },

  { id: "rD-1.1", orbit: "rD", parameter: 0.30411353597566, seedFace: [0, 6, 55, 1, 10, 52], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-1.2", orbit: "rD", parameter: 0.30411353597566, seedFace: [0, 6, 55, 1, 52], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "rD-2.1", orbit: "rD", parameter: 0.61803398874989, seedFace: [0, 24, 53, 1, 17, 56], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-3.1", orbit: "rD", parameter: 0.70710678118654, seedFace: [0, 31, 47, 2, 37, 52], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-3.2", orbit: "rD", parameter: 0.70710678118654, seedFace: [0, 31, 47, 37, 52], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "rD-4.1", orbit: "rD", parameter: 0.78615137775742, seedFace: [0, 6, 51, 1, 10, 47], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-4.2", orbit: "rD", parameter: 0.78615137775742, seedFace: [0, 16, 47, 2, 23, 52], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-5.1", orbit: "rD", parameter: 1.0, seedFace: [0, 6, 21, 27, 10, 1, 36, 44, 42], symmetry: "full", edges: 90, faces: 20 },
  { id: "rD-5.2", orbit: "rD", parameter: 1.0, seedFace: [0, 24, 17, 1, 57, 32, 38, 54], symmetry: "full", edges: 120, faces: 30 },
  { id: "rD-5.3", orbit: "rD", parameter: 1.0, seedFace: [0, 33, 14, 50, 3, 57], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-5-pentagon-a", orbit: "rD", parameter: 1.0, seedFace: [0, 3, 50, 14, 33], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "rD-5-pentagon-b", orbit: "rD", parameter: 1.0, seedFace: [0, 3, 50, 14, 57], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "rD-5-pentagon-c", orbit: "rD", parameter: 1.0, seedFace: [0, 3, 57, 14, 33], symmetry: "rotational", edges: 150, faces: 60 },
  { id: "rD-5.7", orbit: "rD", parameter: 1.0, seedFace: [0, 3, 50, 33, 14, 57], symmetry: "rotational", edges: 180, faces: 60 },
  { id: "rD-6.1", orbit: "rD", parameter: 1.15372137554177, seedFace: [0, 3, 40, 46, 6], symmetry: "full", edges: 150, faces: 60 },
  { id: "rD-7.1", orbit: "rD", parameter: 1.86676039917386, seedFace: [0, 33, 28, 1, 49], symmetry: "full", edges: 150, faces: 60 },
  { id: "rD-7.2", orbit: "rD", parameter: 1.86676039917386, seedFace: [0, 3, 47, 41, 6], symmetry: "full", edges: 150, faces: 60 },
  { id: "rD-8.1", orbit: "rD", parameter: 2.41421356237309, seedFace: [0, 33, 17, 50, 3, 58], symmetry: "full", edges: 180, faces: 60 },
  { id: "rD-8.2", orbit: "rD", parameter: 2.41421356237309, seedFace: [0, 3, 50, 17, 33], symmetry: "rotational", edges: 150, faces: 60 },
] as const satisfies readonly OneParameterRow[];

function oneParameterPoint(orbit: OneParameterOrbit, parameter: number): readonly [number, number, number] {
  if (orbit === "tI") return [0, parameter, 1];
  if (orbit === "tD") return [parameter, 0, 1];
  return [parameter, 1, 0];
}

interface TwoParameterRow {
  readonly id: string;
  readonly orbit: "sC" | "gC" | "sD" | "gD";
  readonly a: number;
  readonly b: number;
  readonly seedFace: readonly number[];
}

/** Appendix B orbit coordinates; one independently enumerated face per faceting. */
const TWO_PARAMETER_DATA = [
  { id: "gC-1.1", orbit: "gC", a: 0.32423426733, b: 1.18085147819018, seedFace: [0, 21, 24, 4, 38] },
  { id: "gC-2.1", orbit: "gC", a: 0.34645087475949, b: 2.33028392884366, seedFace: [0, 5, 36, 40, 16] },
  { id: "gC-3.1", orbit: "gC", a: 0.48247861707892, b: 1.46557123187677, seedFace: [0, 21, 29, 1, 34, 15, 8, 40] },
  { id: "gD-1.1", orbit: "gD", a: 0.01108372009481, b: 0.112127951087, seedFace: [0, 4, 110, 111, 88] },
  { id: "gD-2.1", orbit: "gD", a: 0.02380983028619, b: 0.24392803043993, seedFace: [0, 22, 99, 5, 109] },
  { id: "gD-3.1", orbit: "gD", a: 0.04741988306984, b: 0.61803398874989, seedFace: [0, 4, 94, 55, 111] },
  { id: "gD-4.1", orbit: "gD", a: 0.05118010640774, b: 2.63878671374419, seedFace: [0, 97, 5, 66, 99] },
  { id: "gD-5.1", orbit: "gD", a: 0.05127594286765, b: 2.63479049151064, seedFace: [0, 92, 5, 66, 99] },
  { id: "gD-6.1", orbit: "gD", a: 0.11465912066963, b: 1.22810714457621, seedFace: [0, 99, 66, 5, 109] },
  { id: "gD-7.1", orbit: "gD", a: 0.11846632569635, b: 0.07675775265148, seedFace: [0, 78, 107, 16, 117] },
  { id: "gD-8.1", orbit: "gD", a: 0.16274241765452, b: 1.6180339887499, seedFace: [0, 56, 33, 6, 106] },
  { id: "gD-9.1", orbit: "gD", a: 0.29764703511427, b: 1.41942289885085, seedFace: [0, 109, 16, 74, 116] },
  { id: "gD-10.1", orbit: "gD", a: 0.31243354505702, b: 1.50374485868696, seedFace: [0, 112, 62, 9, 114] },
  { id: "gD-11.1", orbit: "gD", a: 0.328387746463, b: 1.03137278693532, seedFace: [0, 92, 5, 18, 103] },
  { id: "gD-12.1", orbit: "gD", a: 0.35311572845753, b: 1.10579595496772, seedFace: [0, 97, 5, 18, 103] },
  { id: "gD-13.1", orbit: "gD", a: 0.37351289802752, b: 1.51198310285809, seedFace: [0, 4, 94, 19, 114] },
  { id: "gD-14.1", orbit: "gD", a: 0.3923457922999, b: 0.56484799220354, seedFace: [0, 4, 113, 21, 87, 80] },
  { id: "gD-15.1", orbit: "gD", a: 0.55463631656377, b: 0.65986808957912, seedFace: [0, 5, 46, 21, 48] },
  { id: "gD-16.1", orbit: "gD", a: 0.55463631656377, b: 1.39516236309153, seedFace: [0, 39, 5, 26, 61] },
  { id: "gD-17.1", orbit: "gD", a: 0.56207343280969, b: 1.6180339887499, seedFace: [0, 56, 33, 6, 117] },
  { id: "gD-18.1", orbit: "gD", a: 0.58312670229375, b: 0.61803398874989, seedFace: [0, 4, 98, 30, 105] },
  { id: "gD-19.1", orbit: "gD", a: 0.69847844042324, b: 1.6180339887499, seedFace: [0, 64, 86, 29, 112] },
  { id: "gD-20.1", orbit: "gD", a: 0.90356090246739, b: 27.9948087579476, seedFace: [0, 4, 91, 19, 114] },
  { id: "gD-21.1", orbit: "gD", a: 0.94295635374643, b: 0.30619733117445, seedFace: [0, 9, 102, 65, 14] },
  { id: "gD-22.1", orbit: "gD", a: 1, b: 1, seedFace: [0, 106, 47, 59, 98, 1, 117, 6, 68, 56, 12, 115] },
  { id: "gD-23.1", orbit: "gD", a: 1, b: 1.6180339887499, seedFace: [0, 4, 72, 57, 73, 5, 109, 107, 35, 50, 30, 92] },
  { id: "gD-24.1", orbit: "gD", a: 1.01611818567772, b: 0.4010668548007, seedFace: [0, 4, 108, 77, 22] },
  { id: "gD-25.1", orbit: "gD", a: 1.09253461466337, b: 3.06310999954836, seedFace: [0, 93, 18, 5, 97] },
  { id: "gD-26.1", orbit: "gD", a: 1.31752105769268, b: 0.26218853928855, seedFace: [0, 93, 20, 6, 111] },
  { id: "gD-27.1", orbit: "gD", a: 1.6180339887499, b: 0.6180339887499, seedFace: [0, 4, 78, 75, 30, 20, 88, 91, 9, 3, 59, 71] },
  { id: "gD-28.1", orbit: "gD", a: 2.31651242917313, b: 2.31651242917313, seedFace: [0, 76, 51, 6, 92] },
  { id: "gD-29.1", orbit: "gD", a: 2.87943073057631, b: 3.06248738797302, seedFace: [0, 4, 113, 21, 60] },
  { id: "gD-30.1", orbit: "gD", a: 4.91565906049855, b: 2.34432371883024, seedFace: [0, 78, 107, 6, 117] },
  { id: "gD-31.1", orbit: "gD", a: 6.02926886016762, b: 2.3603983469514, seedFace: [0, 78, 107, 6, 111] },
  { id: "gD-32.1", orbit: "gD", a: 6.07511168094542, b: 3.38896106555404, seedFace: [0, 100, 11, 26, 103] },
  { id: "gD-33.1", orbit: "gD", a: 6.22350927459976, b: 2.29490789343316, seedFace: [0, 39, 107, 6, 111] },
  { id: "gD-34.1", orbit: "gD", a: 6.55352072890884, b: 11.7085666611298, seedFace: [0, 26, 99, 111, 35] },
  { id: "gD-35.1", orbit: "gD", a: 8.66154529958774, b: 4.48764831144779, seedFace: [0, 4, 86, 51, 22] },
  { id: "gD-36.1", orbit: "gD", a: 8.68160388607783, b: 4.49171158841194, seedFace: [0, 9, 74, 63, 14] },
  { id: "gD-37.1", orbit: "gD", a: 8.88897281538744, b: 7.04857697405026, seedFace: [0, 4, 94, 85, 27] },
  { id: "gD-38.1", orbit: "gD", a: 13.5220331853894, b: 19.1203500911601, seedFace: [0, 4, 36, 98, 92] },
  { id: "sC-1.1", orbit: "sC", a: 0.28863340344794, b: 0.36110308052865, seedFace: [0, 15, 12, 1, 19] },
  { id: "sC-2.1", orbit: "sC", a: 0.34324491690878, b: 1.81735402102397, seedFace: [0, 6, 18, 2, 19] },
  { id: "sC-3.1", orbit: "sC", a: 0.4142135623731, b: 0.4142135623731, seedFace: [0, 2, 23, 1, 17] },
  { id: "sC-4.1", orbit: "sC", a: 0.41994644680253, b: 1.22346006048543, seedFace: [0, 2, 1, 20, 11] },
  { id: "sC-5.1", orbit: "sC", a: 0.91612594942735, b: 0.54368901269208, seedFace: [0, 4, 1, 11, 8] },
  { id: "sC-6.1", orbit: "sC", a: 2.21352383971935, b: 1.76929235423863, seedFace: [0, 1, 19, 13, 2] },
  { id: "sC-6.2", orbit: "sC", a: 2.21352383971935, b: 1.76929235423863, seedFace: [0, 21, 7, 1, 22] },
  { id: "sD-1.1", orbit: "sD", a: 0.11016974327929, b: 1.27703280443828, seedFace: [0, 1, 50, 25, 47] },
  { id: "sD-2.1", orbit: "sD", a: 0.15888207437274, b: 0.09085618795516, seedFace: [0, 57, 2, 8, 58] },
  { id: "sD-3.1", orbit: "sD", a: 0.18996264849311, b: 0.17390637642569, seedFace: [0, 12, 49, 1, 53] },
  { id: "sD-4.1", orbit: "sD", a: 0.35261409753226, b: 1.40010649156259, seedFace: [0, 1, 49, 9, 57] },
  { id: "sD-5-pentagon-a", orbit: "sD", a: 0.370437368066, b: 0.82141309534209, seedFace: [0, 1, 26, 17, 12] },
  { id: "sD-5-pentagon-b", orbit: "sD", a: 0.370437368066, b: 0.82141309534209, seedFace: [0, 2, 17, 26, 12] },
  { id: "sD-5.3", orbit: "sD", a: 0.370437368066, b: 0.82141309534209, seedFace: [0, 1, 26, 12, 17, 2] },
  { id: "sD-6.1", orbit: "sD", a: 0.37581043477225, b: 0.1944520300324, seedFace: [0, 57, 2, 42, 58] },
  { id: "sD-7.1", orbit: "sD", a: 0.39720495195287, b: 1.17490683772378, seedFace: [0, 33, 2, 8, 47] },
  { id: "sD-8.1", orbit: "sD", a: 0.39980830181552, b: 0.52798351130867, seedFace: [0, 12, 2, 37, 29] },
  { id: "sD-9.1", orbit: "sD", a: 0.43168341659058, b: 0.61803398874989, seedFace: [0, 1, 56, 11, 42, 38] },
  { id: "sD-10.1", orbit: "sD", a: 0.46431261320813, b: 0.40244778596574, seedFace: [0, 22, 56, 6, 44] },
  { id: "sD-11.1", orbit: "sD", a: 0.51745340992064, b: 0.86974913779693, seedFace: [0, 48, 8, 2, 51] },
  { id: "sD-12.1", orbit: "sD", a: 0.53568738679187, b: 1.15372137554177, seedFace: [0, 1, 56, 25, 42] },
  { id: "sD-13.1", orbit: "sD", a: 0.742784217549, b: 7.50347472592154, seedFace: [0, 51, 9, 20, 58] },
  { id: "sD-14.1", orbit: "sD", a: 0.75529263335193, b: 0.29550282412654, seedFace: [0, 12, 54, 1, 41] },
  { id: "sD-15.1", orbit: "sD", a: 0.76778224040442, b: 1.0640050892089, seedFace: [0, 1, 32, 9, 36] },
  { id: "sD-16.1", orbit: "sD", a: 0.86370652781919, b: 0.78083000327643, seedFace: [0, 12, 49, 1, 55] },
  { id: "sD-17.1", orbit: "sD", a: 0.8677722510778, b: 19.0211450688754, seedFace: [0, 55, 35, 3, 57] },
  { id: "sD-18.1", orbit: "sD", a: 1, b: 1.28824561127074, seedFace: [0, 1, 59, 2, 51] },
  { id: "sD-19.1", orbit: "sD", a: 1, b: 1.6180339887499, seedFace: [0, 51, 2, 8, 30, 59] },
  { id: "sD-20.1", orbit: "sD", a: 1.25599806014775, b: 0.25599806014775, seedFace: [0, 48, 10, 3, 52] },
  { id: "sD-21.1", orbit: "sD", a: 1.25599806014775, b: 2.03224755112299, seedFace: [0, 18, 53, 3, 52] },
  { id: "sD-22.1", orbit: "sD", a: 1.324717957244746, b: 0.754877666246693, seedFace: [0, 1, 2, 36, 11, 28] },
  { id: "sD-23.1", orbit: "sD", a: 1.48127239828048, b: 2.78292036767949, seedFace: [0, 1, 2, 55, 48] },
  { id: "sD-24.1", orbit: "sD", a: 2.24229776093289, b: 0.72159639854286, seedFace: [0, 3, 28, 6, 21] },
  { id: "sD-25-pentagon-a", orbit: "sD", a: 3.00251541088553, b: 0.95108806613266, seedFace: [0, 3, 10, 42, 51] },
  { id: "sD-25-pentagon-b", orbit: "sD", a: 3.00251541088553, b: 0.95108806613266, seedFace: [0, 51, 3, 10, 55] },
  { id: "sD-25.3", orbit: "sD", a: 3.00251541088553, b: 0.95108806613266, seedFace: [0, 3, 51, 42, 10, 55] },
  { id: "sD-26.1", orbit: "sD", a: 3.17833652159303, b: 3.56266831660018, seedFace: [0, 1, 46, 54, 2] },
  { id: "sD-27.1", orbit: "sD", a: 3.82179035395245, b: 3.11923267686873, seedFace: [0, 13, 26, 3, 30] },
  { id: "sD-28.1", orbit: "sD", a: 5.09612934933794, b: 2.26016786340074, seedFace: [0, 18, 53, 3, 58] },
  { id: "sD-29.1", orbit: "sD", a: 6.32049316239373, b: 11.8448067511643, seedFace: [0, 1, 49, 30, 59] },
] as const satisfies readonly TwoParameterRow[];

function twoParameterExpected(orbit: TwoParameterRow["orbit"], faceLength: number): readonly [number, number, number] {
  const vertices = orbit === "sC" ? 24 : orbit === "gC" ? 48 : orbit === "sD" ? 60 : 120;
  const faces = orbit === "sC" ? 24 : orbit === "gC" ? (faceLength === 8 ? 24 : 48)
    : orbit === "sD" ? 60 : (faceLength === 12 ? 30 : 120);
  return [vertices, faceLength * faces / 2, faces];
}


export const FINITE_SPECS = [
  ...FIXED_AND_CUBIC_SPECS,
  ...ONE_PARAMETER_DATA.map(row => ({
    id: row.id,
    name: `Icosahedral faceting ${row.id}`,
    orbitGroup: "icosahedral" as const,
    parameters: oneParameterPoint(row.orbit, row.parameter),
    seedFace: row.seedFace,
    symmetry: row.symmetry,
    expected: [60, row.edges, row.faces] as const,
  })),
  ...TWO_PARAMETER_DATA.map(row => ({
    id: row.id,
    name: `Noble faceting ${row.id}`,
    orbitGroup: (row.orbit.endsWith("D") ? "icosahedral" : "octahedral") as OrbitGroup,
    parameters: [row.a, row.b, 1] as const,
    seedFace: row.seedFace,
    symmetry: (row.orbit.startsWith("s") ? "rotational" : "full") as Symmetry,
    vertexSymmetry: (row.orbit.startsWith("s") ? "rotational" : "full") as Symmetry,
    expected: twoParameterExpected(row.orbit, row.seedFace.length),
  })),
] as const satisfies readonly FiniteSpec[];

export type FiniteSpecId = (typeof FINITE_SPECS)[number]["id"];

const numbered = (prefix: string, count: number, suffix = false): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}${suffix ? ".1" : ""}`);
const faceted = (prefix: string, counts: readonly number[]): string[] =>
  counts.flatMap((count, index) => Array.from({ length: count }, (_, face) => `${prefix}-${index + 1}.${face + 1}`));

/** The complete list of symbols in Hill's Appendix A, including unimplemented forms. */
export const KNOWN_FINITE_IDS: readonly string[] = [
  ...numbered("T", 1), ...numbered("O", 1), ...numbered("C", 1),
  ...numbered("I", 4), ...numbered("ID", 6), ...numbered("D", 7),
  ...faceted("tO", [1]), ...faceted("tC", [1]), ...faceted("rC", [1]),
  ...faceted("tI", [2, 2, 2, 2, 7, 1, 1]),
  ...faceted("tD", [2, 1, 2, 1]),
  ...faceted("rD", [2, 1, 2, 2, 7, 1, 2, 2]),
  ...faceted("sC", [1, 1, 1, 1, 1, 2]),
  ...faceted("gC", [1, 1, 1]),
  ...faceted("sD", Array.from({ length: 29 }, (_, index) => index === 4 || index === 24 ? 3 : 1)),
  ...faceted("gD", Array(38).fill(1)),
];

export const CATALOGUE_SOURCE = "https://arxiv.org/pdf/2607.28711";

/** Paper IDs for descriptive IDs whose exact within-tie numbering is not fixed by the paper. */
export const CATALOGUE_ID_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  tetrahedron: ["T-1"], cube: ["C-1"], octahedron: ["O-1"],
  dodecahedron: ["D-1"], icosahedron: ["I-1"],
  "small-stellated-dodecahedron": ["I-2", "I-3"],
  "great-dodecahedron": ["I-2", "I-3"],
  "great-icosahedron": ["I-4"],
  "great-stellated-dodecahedron": ["D-6"],
  "tI-5-pentagon-a": ["tI-5.3", "tI-5.4", "tI-5.5"],
  "tI-5-pentagon-b": ["tI-5.3", "tI-5.4", "tI-5.5"],
  "tI-5-pentagon-c": ["tI-5.3", "tI-5.4", "tI-5.5"],
  "tI-5-hexagon-chiral": ["tI-5.6"],
  "rD-5-pentagon-a": ["rD-5.4", "rD-5.5", "rD-5.6"],
  "rD-5-pentagon-b": ["rD-5.4", "rD-5.5", "rD-5.6"],
  "rD-5-pentagon-c": ["rD-5.4", "rD-5.5", "rD-5.6"],
  "sD-5-pentagon-a": ["sD-5.1", "sD-5.2"],
  "sD-5-pentagon-b": ["sD-5.1", "sD-5.2"],
  "sD-25-pentagon-a": ["sD-25.1", "sD-25.2"],
  "sD-25-pentagon-b": ["sD-25.1", "sD-25.2"],
};
