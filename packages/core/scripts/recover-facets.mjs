#!/usr/bin/env node
// Reconstruct catalogue face cycles from orbit coordinates and symmetry.
// Build @noble-shapes/core first, then run with an ID or --all.
import { FINITE_SPECS, finiteOrbitData } from "../dist/finite.js";

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const edgeKey = (a, b) => `${Math.min(a, b)}:${Math.max(a, b)}`;

function canonicalCycle(face) {
  const directions = [face, [...face].reverse()];
  const cycles = directions.flatMap(source => source.map((_, index) => [...source.slice(index), ...source.slice(0, index)]));
  cycles.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return cycles[0];
}

function planesThroughFirstVertex(vertices, minimumSize) {
  const radius = Math.hypot(...vertices[0]);
  const points = vertices.map(vertex => vertex.map(value => value / radius));
  const planes = new Map();
  for (let b = 1; b < points.length; b++) for (let c = b + 1; c < points.length; c++) {
    const normal = cross(subtract(points[b], points[0]), subtract(points[c], points[0]));
    const magnitude = Math.hypot(...normal);
    if (magnitude < 1e-9) continue;
    const plane = points.flatMap((point, index) =>
      Math.abs(dot(normal, subtract(point, points[0]))) / magnitude < 3e-8 ? [index] : []);
    if (plane.length >= minimumSize) planes.set(plane.join(":"), plane);
  }
  return [...planes.values()];
}

function* cyclesAtFirstVertex(adjacency, length) {
  function* walk(path) {
    if (path.length === length) {
      if (adjacency.get(path.at(-1)).has(0) && path[1] < path.at(-1)) yield path;
      return;
    }
    for (const next of adjacency.get(path.at(-1))) {
      if (next !== 0 && !path.includes(next)) yield* walk([...path, next]);
    }
  }
  yield* walk([0]);
}

function faceOrbit(face, permutations) {
  const faces = new Map();
  for (const permutation of permutations) {
    const mapped = canonicalCycle(face.map(index => permutation[index]));
    faces.set(mapped.join(":"), mapped);
  }
  return [...faces.values()];
}

function validPolyhedron(faces, expected) {
  const [vertices, edges, faceCount] = expected;
  if (faces.length !== faceCount) return false;
  const incidence = new Map(), links = Array.from({ length: vertices }, () => new Map());
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const before = face[(i + face.length - 1) % face.length];
      const current = face[i], after = face[(i + 1) % face.length];
      const key = edgeKey(current, after);
      incidence.set(key, (incidence.get(key) ?? 0) + 1);
      const link = links[current];
      if (!link.has(before)) link.set(before, new Set());
      if (!link.has(after)) link.set(after, new Set());
      link.get(before).add(after); link.get(after).add(before);
    }
  }
  if (incidence.size !== edges || [...incidence.values()].some(count => count !== 2)) return false;
  for (const link of links) {
    if (!link.size || [...link.values()].some(neighbors => neighbors.size !== 2)) return false;
    const visited = new Set([link.keys().next().value]), queue = [...visited];
    for (const current of queue) for (const next of link.get(current)) {
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    if (visited.size !== link.size) return false;
  }
  return true;
}

function recover(spec) {
  const { vertices, permutations } = finiteOrbitData(spec);
  const faceLength = 2 * spec.expected[1] / spec.expected[2];
  const results = new Map();
  for (const base of planesThroughFirstVertex(vertices, faceLength)) {
    const equivalentPlanes = new Map();
    for (const permutation of permutations) {
      const plane = base.map(index => permutation[index]).sort((a, b) => a - b);
      equivalentPlanes.set(plane.join(":"), plane);
    }
    const adjacency = new Map(base.map(index => [index, new Set()]));
    const baseSet = new Set(base);
    for (const other of equivalentPlanes.values()) {
      const intersection = other.filter(index => baseSet.has(index));
      if (intersection.length === 2) {
        adjacency.get(intersection[0]).add(intersection[1]);
        adjacency.get(intersection[1]).add(intersection[0]);
      }
    }
    for (const face of cyclesAtFirstVertex(adjacency, faceLength)) {
      const faces = faceOrbit(face, permutations);
      if (validPolyhedron(faces, spec.expected)) {
        results.set(faces.map(polygon => polygon.join(":")).sort().join("|"), face);
      }
    }
  }
  const expectedFaces = faceOrbit(spec.seedFace, permutations);
  const expectedKey = expectedFaces.map(polygon => polygon.join(":")).sort().join("|");
  if (!results.has(expectedKey)) throw new Error(`${spec.id}: stored seed was not recovered`);
  return [...results.values()];
}

const target = process.argv[2];
const selected = target === "--all" ? FINITE_SPECS : FINITE_SPECS.filter(spec => spec.id === target);
if (!selected.length) throw new Error(`Choose a catalogue ID or --all (received ${target ?? "nothing"})`);
for (const spec of selected) {
  const seeds = recover(spec);
  if (target !== "--all") console.log(`${spec.id}: ${seeds.length} faceting(s), seeds ${seeds.map(face => `[${face.join(", ")}]`).join("; ")}`);
}
if (target === "--all") console.log(`Recovered and checked ${selected.length} catalogue seeds.`);
