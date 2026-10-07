import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { DEFAULT_WORKBENCH_OPTIONS, optionsToString, renderScene, rotateVertex, stringToOptions } from "../packages/render/dist/index.js";
import { renderPng } from "../packages/node/dist/index.js";
import { SHAPES } from "../packages/core/dist/index.js";

function checkPngPixels(options) {
  const image = renderScene(options), png = renderPng(options);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.equal(view.getUint32(16), options.width);
  assert.equal(view.getUint32(20), options.height);
  let offset = 8, compressed;
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "IDAT") compressed = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
  }
  assert.ok(compressed);
  const rows = inflateSync(compressed);
  for (let y = 0; y < image.height; y++) {
    assert.equal(rows[y * (image.width * 4 + 1)], 0);
    assert.deepEqual(rows.subarray(y * (image.width * 4 + 1) + 1, (y + 1) * (image.width * 4 + 1)), Buffer.from(image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4)));
  }
}

test("Node PNG contains exactly the shared renderer's pixels in every study view", () => {
  for (const view of ["solid", "solid-wireframe", "wireframe", "face", "face-context"]) {
    checkPngPixels({ shape: "great-stellated-dodecahedron", view, palette: "gold", width: 72, height: 72, yaw: 0.55, pitch: view === "face" ? 0 : 0.72 });
  }
  checkPngPixels({ shape: "great-dodecahedron", view: "face-context", width: 72, height: 72,
    rotation: [0.18, 0.32, -0.07, Math.sqrt(1 - 0.18 ** 2 - 0.32 ** 2 - 0.07 ** 2)] });
  checkPngPixels({ shape: "icosahedron", view: "solid-wireframe", background: "transparent", width: 72, height: 72 });
});

test("transparent backgrounds preserve alpha in the shared browser and Node pixels", () => {
  const image = renderScene({ shape: "icosahedron", background: "transparent", width: 72, height: 72 });
  assert.equal(image.data[3], 0);
  assert.ok(image.data.some((value, index) => index % 4 === 3 && value === 255));
  assert.ok(image.data.some((value, index) => index % 4 === 3 && value > 0 && value < 255));
});

test("design codes round-trip every visual option and reject invalid values", () => {
  const options = { ...DEFAULT_WORKBENCH_OPTIONS, shape: "stephanoid", view: "face-context",
    palette: "gold", color: "#dace89", background: "transparent", yaw: -0.7, pitch: 0.33,
    rotation: [0, Math.sin(0.2), 0, Math.cos(0.2)], zoom: 1.19, faceIndex: 2,
    n: 7, p: 3, q: 1, crownHeight: 0.82, a: 1.21, b: 0.88, c: 1.03,
    rotate: 0.42, float: 0.31, theme: "dark" };
  const code = optionsToString(options);
  assert.match(code, /^np1_[A-Za-z0-9_-]+$/);
  assert.deepEqual(stringToOptions(code), options);
  assert.equal(optionsToString(stringToOptions(code)), code);
  assert.throws(() => stringToOptions("np2_invalid"), /Unsupported design code/);
  assert.throws(() => optionsToString({ ...options, rotate: 2 }), /invalid motion/);
  assert.throws(() => optionsToString({ ...options, color: "red" }), /invalid color/);
});

test("horizontal and vertical drag axes turn the 3D form toward the pointer", () => {
  const front = [0, 0, 1];
  const right = rotateVertex(front, Math.PI / 2, 0);
  const down = rotateVertex(front, 0, Math.PI / 2);
  assert.ok(right[0] > 0.999 && Math.abs(right[1]) < 1e-12);
  assert.ok(down[1] < -0.999 && Math.abs(down[0]) < 1e-12);
  const quaternion = [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)];
  const trackballRight = rotateVertex(front, 0, 0, quaternion);
  assert.ok(trackballRight[0] > 0.999 && Math.abs(trackballRight[2]) < 1e-12);
});

test("the Node renderer produces an image for every finite form", () => {
  for (const { id, family } of SHAPES) {
    if (family !== "Finite") continue;
    const png = renderPng({ shape: id, view: "solid", width: 32, height: 32, quality: 1 });
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], id);
  }
});
