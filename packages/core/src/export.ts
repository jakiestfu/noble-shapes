import type { Polyhedron, Vec3 } from "./index.js";

type Point2 = readonly [number, number];

function orient(a: Point2, b: Point2, c: Point2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** A GLB triangle fan is faithful only for a simple, convex face cycle. */
function isSimpleConvexFace(face: readonly number[], vertices: readonly Vec3[]): boolean {
  if (face.length === 3) return true;
  const a = vertices[face[0]!]!, b = vertices[face[1]!]!, c = vertices[face[2]!]!;
  const normal: Vec3 = [
    (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
    (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
  ];
  if (Math.hypot(...normal) < 1e-10) return false;
  const drop = Math.abs(normal[0]) > Math.abs(normal[1])
    ? Math.abs(normal[0]) > Math.abs(normal[2]) ? 0 : 2
    : Math.abs(normal[1]) > Math.abs(normal[2]) ? 1 : 2;
  const points: Point2[] = face.map(index => {
    const vertex = vertices[index]!;
    return drop === 0 ? [vertex[1], vertex[2]] : drop === 1 ? [vertex[0], vertex[2]] : [vertex[0], vertex[1]];
  });
  const area = points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length]!;
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  if (Math.abs(area) < 1e-10) return false;
  const direction = Math.sign(area);
  for (let i = 0; i < points.length; i++) {
    if (orient(points[i]!, points[(i + 1) % points.length]!, points[(i + 2) % points.length]!) * direction < -1e-9) return false;
  }
  for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
    if (i === 0 && j === points.length - 1) continue;
    const a0 = points[i]!, a1 = points[(i + 1) % points.length]!;
    const b0 = points[j]!, b1 = points[(j + 1) % points.length]!;
    if (orient(a0, a1, b0) * orient(a0, a1, b1) < -1e-12
      && orient(b0, b1, a0) * orient(b0, b1, a1) < -1e-12) return false;
  }
  return true;
}

function colorChannels(color: string): readonly [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("GLB color must be a six-digit hex value");
  return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255) as unknown as readonly [number, number, number];
}

/** Export exact edges and face cycles, with shaded triangles for simple convex faces. */
export function polyhedronToGlb(polyhedron: Polyhedron, color = "#5ce0d3"): Uint8Array<ArrayBuffer> {
  const rgb = colorChannels(color);
  const triangles: number[] = [];
  let wireframeFaces = 0;
  for (const face of polyhedron.faces) {
    if (!isSimpleConvexFace(face, polyhedron.vertices)) { wireframeFaces++; continue; }
    for (let i = 1; i + 1 < face.length; i++) triangles.push(face[0]!, face[i]!, face[i + 1]!);
  }
  const lines = polyhedron.edges.flatMap(([a, b]) => [a, b]);
  const positionLength = polyhedron.vertices.length * 12;
  const triangleLength = triangles.length * 4;
  const lineLength = lines.length * 4;
  const binaryLength = positionLength + triangleLength + lineLength;
  const binary = new Uint8Array(binaryLength);
  const data = new DataView(binary.buffer);
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  polyhedron.vertices.forEach((vertex, index) => vertex.forEach((value, axis) => {
    const rounded = Math.fround(value);
    data.setFloat32(index * 12 + axis * 4, rounded, true);
    minimum[axis] = Math.min(minimum[axis]!, rounded);
    maximum[axis] = Math.max(maximum[axis]!, rounded);
  }));
  triangles.forEach((index, i) => data.setUint32(positionLength + i * 4, index, true));
  lines.forEach((index, i) => data.setUint32(positionLength + triangleLength + i * 4, index, true));

  const bufferViews = [{ buffer: 0, byteOffset: 0, byteLength: positionLength, target: 34962 }];
  const accessors: Array<Record<string, unknown>> = [
    { bufferView: 0, componentType: 5126, count: polyhedron.vertices.length, type: "VEC3", min: minimum, max: maximum },
  ];
  const primitives: Array<Record<string, unknown>> = [];
  if (triangles.length) {
    bufferViews.push({ buffer: 0, byteOffset: positionLength, byteLength: triangleLength, target: 34963 });
    accessors.push({ bufferView: 1, componentType: 5125, count: triangles.length, type: "SCALAR" });
    primitives.push({ attributes: { POSITION: 0 }, indices: 1, material: 0, mode: 4 });
  }
  const lineView = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset: positionLength + triangleLength, byteLength: lineLength, target: 34963 });
  accessors.push({ bufferView: lineView, componentType: 5125, count: lines.length, type: "SCALAR" });
  primitives.push({ attributes: { POSITION: 0 }, indices: accessors.length - 1, material: 1, mode: 1 });
  const document = {
    asset: { version: "2.0", generator: "@noble-polyhedra/core" },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: polyhedron.name, mesh: 0 }],
    meshes: [{ name: polyhedron.name, primitives, extras: {
      shapeId: polyhedron.id, family: polyhedron.family, faceCycles: polyhedron.faces,
      wireframeFaces,
    } }],
    materials: [
      { doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [...rgb, 1], metallicFactor: 0, roughnessFactor: 0.8 } },
      { doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [...rgb, 1], metallicFactor: 0, roughnessFactor: 1 } },
    ],
    buffers: [{ byteLength: binaryLength }], bufferViews, accessors,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(document));
  const jsonLength = (encoded.length + 3) & ~3;
  const totalLength = 12 + 8 + jsonLength + 8 + binaryLength;
  const result = new Uint8Array(totalLength);
  const header = new DataView(result.buffer);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, totalLength, true);
  header.setUint32(12, jsonLength, true);
  header.setUint32(16, 0x4e4f534a, true);
  result.set(encoded, 20);
  result.fill(0x20, 20 + encoded.length, 20 + jsonLength);
  const binaryHeader = 20 + jsonLength;
  header.setUint32(binaryHeader, binaryLength, true);
  header.setUint32(binaryHeader + 4, 0x004e4942, true);
  result.set(binary, binaryHeader + 8);
  return result;
}
