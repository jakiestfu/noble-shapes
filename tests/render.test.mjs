import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { renderScene } from "../packages/render/dist/index.js";
import { renderPng } from "../packages/node/dist/index.js";

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
});
