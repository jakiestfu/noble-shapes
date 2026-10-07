import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createPolyhedron, SHAPES, seededDefaults, KNOWN_FINITE_COUNT, IMPLEMENTED_FINITE_COUNT } from "../packages/core/dist/index.js";

function checkGeometry(poly) {
  const radius = Math.hypot(...poly.vertices[0]);
  for (const vertex of poly.vertices) assert.ok(Math.abs(Math.hypot(...vertex) - radius) < 1e-10, "vertices lie on one sphere");
  const incidence = new Map();
  for (const face of poly.faces) {
    assert.ok(face.length >= 3);
    const [a, b, c] = face.map(i => poly.vertices[i]);
    const u = b.map((value, i) => value - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const vertexIndex of face) {
      const point = poly.vertices[vertexIndex];
      const distance = normal.reduce((sum, value, i) => sum + value * (point[i] - a[i]), 0);
      assert.ok(Math.abs(distance) < 1e-9, "face is planar");
    }
    for (let i = 0; i < face.length; i++) {
      const key = [face[i], face[(i + 1) % face.length]].sort((x, y) => x - y).join(":");
      incidence.set(key, (incidence.get(key) ?? 0) + 1);
    }
  }
  assert.equal(incidence.size, poly.edges.length);
  for (const count of incidence.values()) assert.equal(count, 2, "each abstract edge has two incident faces");
  for (let vertex = 0; vertex < poly.vertices.length; vertex++) {
    const link = new Map();
    for (const face of poly.faces) {
      const position = face.indexOf(vertex);
      if (position < 0) continue;
      const before = face[(position + face.length - 1) % face.length];
      const after = face[(position + 1) % face.length];
      if (!link.has(before)) link.set(before, new Set());
      if (!link.has(after)) link.set(after, new Set());
      link.get(before).add(after);
      link.get(after).add(before);
    }
    assert.ok(link.size > 0, "vertex has incident faces");
    for (const neighbors of link.values()) assert.equal(neighbors.size, 2, "vertex link is locally circular");
    const visited = new Set([link.keys().next().value]);
    const queue = [...visited];
    for (const current of queue) for (const next of link.get(current)) {
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    assert.equal(visited.size, link.size, "vertex figure is one polygon");
  }
}

test("every representative shape is planar, spherical, and closed", () => {
  for (const { id } of SHAPES) checkGeometry(createPolyhedron({ shape: id }));
});

test("all 146 finite entries are distinct and available", () => {
  assert.equal(KNOWN_FINITE_COUNT, 146);
  assert.equal(IMPLEMENTED_FINITE_COUNT, 146);
  const finite = SHAPES.filter(shape => shape.family === "Finite");
  assert.equal(new Set(finite.map(shape => shape.id)).size, 146);
  const geometries = new Set();
  for (const { id } of finite) {
    const poly = createPolyhedron({ shape: id });
    const vertexKeys = poly.vertices.map(vertex => vertex.map(value => value.toFixed(6)).join(","));
    const signature = poly.faces.map(face => face.map((index, offset) =>
      [vertexKeys[index], vertexKeys[face[(offset + 1) % face.length]]].sort().join("~")).sort().join(";"))
      .sort().join("|");
    assert.ok(!geometries.has(signature), `Duplicate finite geometry: ${id}`);
    geometries.add(signature);
  }
});

test("faceting enumeration independently recovers every stored finite seed", () => {
  const script = fileURLToPath(new URL("../packages/core/scripts/recover-facets.mjs", import.meta.url));
  const result = execFileSync(process.execPath, [script, "--all"], { encoding: "utf8", timeout: 15_000 });
  assert.match(result, /Recovered and checked 137 catalogue seeds/);
});

test("the finite examples match the paper's vertex, edge, and face counts", () => {
  const counts = {
    tetrahedron: [4, 6, 4],
    cube: [8, 12, 6],
    octahedron: [6, 12, 8],
    dodecahedron: [20, 30, 12],
    icosahedron: [12, 30, 20],
    "small-stellated-dodecahedron": [12, 30, 12],
    "great-dodecahedron": [12, 30, 12],
    "great-stellated-dodecahedron": [20, 30, 12],
    "great-icosahedron": [12, 30, 20],
  };
  for (const [shape, expected] of Object.entries(counts)) {
    const poly = createPolyhedron({ shape });
    assert.deepEqual([poly.vertices.length, poly.edges.length, poly.faces.length], expected);
  }
});

test("great stellated faces lie in the dodecahedron's interior planes", () => {
  const poly = createPolyhedron({ shape: "great-stellated-dodecahedron" });
  for (const face of poly.faces) {
    const [a, b, c] = face.map(i => poly.vertices[i]);
    const u = b.map((value, i) => value - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const distances = poly.vertices.map(point => normal.reduce((sum, value, i) => sum + value * (point[i] - a[i]), 0));
    assert.ok(distances.some(value => value > 1e-8) && distances.some(value => value < -1e-8));
  }
});

test("the two parametrized families retain their invariants", () => {
  for (const parameters of [
    { shape: "disphenoid", a: 1.7, b: 0.9, c: 0.5 },
    { shape: "stephanoid", n: 7, p: 4, q: 1, crownHeight: 1.2 },
    { shape: "antistephanoid", n: 7, p: 3, q: 1, crownHeight: 0.45 },
    { shape: "antistephanoid", n: 4, p: 2, q: 1, crownHeight: 0.7 },
  ]) checkGeometry(createPolyhedron(parameters));
});

test("seed selection is repeatable", () => {
  assert.deepEqual(seededDefaults("avatar-42"), seededDefaults("avatar-42"));
  const selected = new Set(Array.from({ length: 500 }, (_, index) => seededDefaults(`avatar-${index}`).shape));
  assert.ok(selected.size > 50, "seeds explore the catalogue");
  assert.ok([...selected].some(id => id.startsWith("sD-") || id.startsWith("gD-")), "two-parameter forms can be selected");
});

test("common factors that create crown compounds are rejected", () => {
  assert.throws(() => createPolyhedron({ shape: "stephanoid", n: 10, p: 6, q: 2 }), /compound/);
  assert.throws(() => createPolyhedron({ shape: "antistephanoid", n: 15, p: 6, q: 3 }), /compound/);
});
