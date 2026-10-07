import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { clearRenderCaches, createGeometryCache, DEFAULT_WORKBENCH_OPTIONS, designForTheme, optionsToString, PALETTES, randomOptions, renderPolyhedron, renderScene, resolveSceneOptions, rotateVertex, stringToOptions } from "../packages/render/dist/index.js";
import { renderPng } from "../packages/node/dist/index.js";
import { createPolyhedron, SHAPES } from "../packages/core/dist/index.js";

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

test("cached meshes and backgrounds preserve pixels across camera, color, and alpha changes", () => {
  const geometry = createGeometryCache(2);
  const first = geometry.get({ shape: "cube" });
  assert.equal(first.hit, false);
  assert.equal(geometry.get({ shape: "cube" }).polyhedron, first.polyhedron);
  assert.equal(geometry.get({ shape: "cube" }).hit, true);
  assert.equal(geometry.get({ shape: "tetrahedron" }).hit, false);
  const options = { width: 96, height: 96, quality: 2, view: "solid-wireframe" };
  clearRenderCaches();
  let coldTiming, warmTiming;
  const cold = renderPolyhedron(first.polyhedron, { ...options, onTiming: value => { coldTiming = value; } });
  renderPolyhedron(first.polyhedron, { ...options, background: "transparent", yaw: 1 });
  renderPolyhedron(first.polyhedron, { ...options, color: "#ff0000" });
  renderPolyhedron(first.polyhedron, options);
  const warm = renderPolyhedron(first.polyhedron, { ...options, onTiming: value => { warmTiming = value; } });
  assert.equal(coldTiming.backgroundCacheHit, false);
  assert.equal(warmTiming.backgroundCacheHit, true);
  assert.deepEqual(warm.data, cold.data);
  clearRenderCaches();
  const transparentCold = renderPolyhedron(first.polyhedron, { ...options, background: "transparent" });
  renderPolyhedron(first.polyhedron, options);
  const transparentWarm = renderPolyhedron(first.polyhedron, { ...options, background: "transparent" });
  assert.deepEqual(transparentWarm.data, transparentCold.data);
});

test("design codes capture only form and appearance and read older links", () => {
  const options = { ...DEFAULT_WORKBENCH_OPTIONS, shape: "stephanoid", view: "face-context",
    palette: "gold", paletteLinked: false, color: "#dace89", background: "transparent", yaw: -0.7, pitch: 0.33,
    rotation: [0, Math.sin(0.2), 0, Math.cos(0.2)], zoom: 1.19, faceIndex: 2,
    n: 7, p: 3, q: 1, crownHeight: 0.82, a: 1.21, b: 0.88, c: 1.03,
    rotate: 0.42, float: 0.31, theme: "dark" };
  const code = optionsToString(options);
  const { yaw, pitch, rotation, zoom, rotate, float, theme, ...design } = options;
  assert.match(code, /^np4_[A-Za-z0-9_-]+$/);
  assert.deepEqual(stringToOptions(code), design);
  assert.equal(optionsToString(stringToOptions(code)), code);
  assert.equal(optionsToString({ ...options, yaw: 1, pitch: -0.5, zoom: 1.8, rotate: 1, float: 1, theme: "light" }), code);
  const oldTuple = [options.shape, options.view, options.palette, options.color, options.background,
    yaw, pitch, rotation, zoom, options.faceIndex, options.n, options.p, options.q,
    options.crownHeight, options.a, options.b, options.c, rotate, float, theme];
  assert.deepEqual(stringToOptions(`np1_${Buffer.from(JSON.stringify(oldTuple)).toString("base64url")}`), design);
  const previousTuple = [options.shape, options.view, options.palette, options.color, options.background,
    options.faceIndex, options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c];
  assert.deepEqual(stringToOptions(`np2_${Buffer.from(JSON.stringify(previousTuple)).toString("base64url")}`), design);
  assert.deepEqual(stringToOptions(`np3_${Buffer.from(JSON.stringify([...previousTuple, options.paletteLinked])).toString("base64url")}`), design);
  assert.equal(stringToOptions(`np4_${Buffer.from(JSON.stringify([...previousTuple, options.paletteLinked, "cel"])).toString("base64url")}`).material, "studio");
  assert.throws(() => stringToOptions("np5_invalid"), /Unsupported design code/);
  assert.throws(() => optionsToString({ ...options, color: "red" }), /invalid color/);
  assert.throws(() => optionsToString({ ...options, material: "glass" }), /invalid material/);
});

test("Studio is the only renderer material; older design codes use it", () => {
  const scene = { shape: "dodecahedron", view: "solid", background: "transparent", width: 80, height: 80 };
  checkPngPixels({ ...scene, material: "studio" });
  assert.throws(() => renderScene({ ...scene, material: "clay" }), /Unknown material/);
  assert.throws(() => renderScene({ ...scene, material: "marble" }), /Unknown material/);
  const code = optionsToString(DEFAULT_WORKBENCH_OPTIONS);
  const tuple = JSON.parse(Buffer.from(code.slice(4), "base64url").toString());
  for (const oldMaterial of ["cel", "clay", "marble"]) {
    const oldCode = `np4_${Buffer.from(JSON.stringify([...tuple.slice(0, 14), oldMaterial])).toString("base64url")}`;
    assert.equal(stringToOptions(oldCode).material, "studio");
  }
});

test("linked palettes follow the viewer theme without changing the shared design code", () => {
  for (const [name, palette] of Object.entries(PALETTES)) {
    const dark = { ...DEFAULT_WORKBENCH_OPTIONS, palette: name, paletteLinked: true,
      color: palette.color, background: palette.background };
    const code = optionsToString(dark);
    const light = designForTheme(dark, "light");
    assert.equal(light.color, palette.light.color);
    assert.equal(light.background, palette.light.background);
    assert.equal(optionsToString(light), code);
    assert.deepEqual(designForTheme(light, "dark"), dark);
    const custom = { ...light, color: "#123456", paletteLinked: false };
    assert.equal(designForTheme(custom, "dark"), custom);
    assert.notEqual(optionsToString(custom), code);
  }
  const transparent = { ...DEFAULT_WORKBENCH_OPTIONS, background: "transparent" };
  assert.equal(designForTheme(transparent, "light").background, "transparent");
  assert.equal(optionsToString(designForTheme(transparent, "light")), optionsToString(transparent));
  const previous = [transparent.shape, transparent.view, transparent.palette, transparent.color, transparent.background,
    transparent.faceIndex, transparent.n, transparent.p, transparent.q, transparent.crownHeight,
    transparent.a, transparent.b, transparent.c];
  assert.equal(stringToOptions(`np2_${Buffer.from(JSON.stringify(previous)).toString("base64url")}`).paletteLinked, true);
});

test("identity seeds generate complete reproducible designs separate from design codes", () => {
  const first = randomOptions("foobar");
  assert.deepEqual(first, randomOptions("foobar"));
  assert.notDeepEqual(first, randomOptions("another-user"));
  assert.deepEqual(stringToOptions(optionsToString(first)), first);
  for (const local of ["yaw", "pitch", "rotation", "zoom", "rotate", "float", "theme"]) assert.equal(local in first, false);
  assert.equal("random" in stringToOptions(optionsToString(first)), false);
  for (let i = 0; i < 150; i++) {
    const design = randomOptions(`avatar-${i}`);
    assert.ok(design.faceIndex < createPolyhedron(design).faces.length);
    assert.deepEqual(stringToOptions(optionsToString(design)), design);
  }
});

test("explicit rendering options override a seeded draw in Node and the shared renderer", () => {
  const seed = "foobar";
  const options = { random: seed, shape: "cube", palette: "gold", color: "#123456", view: "solid", zoom: 1.2, width: 72, height: 72 };
  const resolved = resolveSceneOptions(options);
  assert.equal(resolved.shape, "cube");
  assert.equal(resolved.palette, "gold");
  assert.equal(resolved.color, "#123456");
  assert.equal(resolved.view, "solid");
  assert.equal(resolved.zoom, 1.2);
  assert.ok(resolved.faceIndex < createPolyhedron(resolved).faces.length);
  assert.deepEqual(renderScene(options).data, renderScene(resolved).data);
  checkPngPixels(options);
  const family = resolveSceneOptions({ random: seed, shape: "stephanoid", n: 7, p: 3, q: 1 });
  assert.ok(family.faceIndex < createPolyhedron(family).faces.length);
  assert.equal(resolveSceneOptions({ random: seed, view: "face" }).pitch, 0);
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
