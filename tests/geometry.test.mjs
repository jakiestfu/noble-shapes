import assert from "node:assert/strict";
import test from "node:test";
import { createPolyhedron, SHAPES, seededDefaults } from "../packages/core/dist/index.js";

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
}

test("every representative shape is planar, spherical, and closed", () => {
  for (const { id } of SHAPES) checkGeometry(createPolyhedron({ shape: id }));
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
});

test("common factors that create crown compounds are rejected", () => {
  assert.throws(() => createPolyhedron({ shape: "stephanoid", n: 10, p: 6, q: 2 }), /compound/);
  assert.throws(() => createPolyhedron({ shape: "antistephanoid", n: 15, p: 6, q: 3 }), /compound/);
});
