import assert from "node:assert/strict";
import test from "node:test";
import { createPolyhedron, polyhedronToGlb, SHAPES } from "../packages/core/dist/index.js";

function parseGlb(bytes) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(data.getUint32(0, true), 0x46546c67);
  assert.equal(data.getUint32(4, true), 2);
  assert.equal(data.getUint32(8, true), bytes.byteLength);
  const jsonLength = data.getUint32(12, true);
  assert.equal(data.getUint32(16, true), 0x4e4f534a);
  assert.equal(jsonLength % 4, 0);
  const document = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const binaryHeader = 20 + jsonLength;
  const binaryLength = data.getUint32(binaryHeader, true);
  assert.equal(data.getUint32(binaryHeader + 4, true), 0x004e4942);
  assert.equal(binaryHeader + 8 + binaryLength, bytes.byteLength);
  assert.equal(document.buffers[0].byteLength, binaryLength);
  return { document, binary: bytes.subarray(binaryHeader + 8) };
}

test("every catalogue shape exports a well-formed GLB with exact edges and face cycles", () => {
  for (const { id } of SHAPES) {
    const polyhedron = createPolyhedron({ shape: id });
    const { document, binary } = parseGlb(polyhedronToGlb(polyhedron));
    assert.equal(document.asset.version, "2.0");
    assert.equal(document.accessors[0].count, polyhedron.vertices.length);
    assert.deepEqual(document.meshes[0].extras.faceCycles, polyhedron.faces);
    const lines = document.meshes[0].primitives.find(primitive => primitive.mode === 1);
    assert.ok(lines, `${id} has an edge primitive`);
    assert.equal(document.accessors[lines.indices].count, polyhedron.edges.length * 2);
    const lineView = document.bufferViews[document.accessors[lines.indices].bufferView];
    const edgeData = new DataView(binary.buffer, binary.byteOffset + lineView.byteOffset, lineView.byteLength);
    assert.deepEqual(
      Array.from({ length: polyhedron.edges.length * 2 }, (_, index) => edgeData.getUint32(index * 4, true)),
      polyhedron.edges.flat(),
      `${id} retains its exact edge indices`,
    );
    for (const view of document.bufferViews) {
      assert.equal(view.byteOffset % 4, 0);
      assert.ok(view.byteOffset + view.byteLength <= binary.byteLength);
    }
    const vertexView = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    for (let index = 0; index < polyhedron.vertices.length * 3; index++) {
      assert.ok(Number.isFinite(vertexView.getFloat32(index * 4, true)));
    }
  }
});

test("GLB fills a cube while retaining crossing star faces as exact edge geometry", () => {
  const cubePolyhedron = createPolyhedron({ shape: "cube" });
  const cube = parseGlb(polyhedronToGlb(cubePolyhedron, "#ff8844")).document;
  const triangles = cube.meshes[0].primitives.find(primitive => primitive.mode === 4);
  assert.equal(cube.accessors[triangles.indices].count, 36);
  assert.equal(cube.meshes[0].extras.wireframeFaces, 0);
  const star = createPolyhedron({ shape: "small-stellated-dodecahedron" });
  const starGlb = parseGlb(polyhedronToGlb(star)).document;
  assert.equal(starGlb.meshes[0].extras.wireframeFaces, star.faces.length);
  assert.equal(starGlb.meshes[0].primitives.some(primitive => primitive.mode === 4), false);
  assert.throws(() => polyhedronToGlb(cubePolyhedron, "red"), /six-digit hex/);
});
