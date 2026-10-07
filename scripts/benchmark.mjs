#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { cpus, platform, arch, totalmem } from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createPolyhedron, IMPLEMENTED_FINITE_COUNT, seededDefaults, SHAPES } from "../packages/core/dist/index.js";
import { clearRenderCaches, createGeometryCache, MATERIAL_NAMES, renderPolyhedron, renderScene, resolveSceneOptions } from "../packages/render/dist/index.js";
import { encodePng, renderPng } from "../packages/node/dist/index.js";

const FAMILY_CASES = [
  { shape: "disphenoid", label: "default", params: {} },
  { shape: "disphenoid", label: "equiaxed", params: { a: 1, b: 1, c: 1 } },
  { shape: "disphenoid", label: "elongated", params: { a: 3, b: 1, c: 0.3 } },
  { shape: "stephanoid", label: "small n=5", params: { n: 5, p: 3, q: 1 } },
  { shape: "stephanoid", label: "medium n=31", params: { n: 31, p: 11, q: 3 } },
  { shape: "stephanoid", label: "large n=101", params: { n: 101, p: 35, q: 9 } },
  { shape: "antistephanoid", label: "small n=4", params: { n: 4, p: 2, q: 1 } },
  { shape: "antistephanoid", label: "medium n=31", params: { n: 31, p: 11, q: 3 } },
  { shape: "antistephanoid", label: "large n=101", params: { n: 101, p: 35, q: 9 } },
];
const VIEWS = new Set(["solid", "solid-wireframe", "wireframe", "face", "face-context"]);
const FLAGS = new Set(["all", "json", "help", "list"]);
const VALUES = new Set(["shape", "family", "width", "height", "quality", "view", "samples", "warmup",
  "output", "compare", "seed", "n", "p", "q", "crown-height", "a", "b", "c", "background", "palette", "color", "material", "yaw", "pitch", "zoom", "face-index"]);

function usage() {
  return `Noble Shapes CPU benchmark

  pnpm bench --shape cube
  pnpm bench --all
  pnpm bench --family stephanoid
  pnpm bench --shape stephanoid --n 31 --p 11 --q 3
  pnpm bench --shape great-stellated-dodecahedron --view wireframe --width 1024 --height 1024

Options:
  --all                    All ${IMPLEMENTED_FINITE_COUNT} finite forms plus nine family samples
  --shape ID               One finite form or one family with optional geometry parameters
  --family NAME            All samples for disphenoid, stephanoid, antistephanoid, or all
  --list                   List form IDs and family sample names
  --width N --height N     Output pixels (default: 512 single, 256 suite)
  --quality 1|2            Internal supersampling (default: 2)
  --view NAME              solid, solid-wireframe, wireframe, face, face-context
  --material NAME          studio (default: studio)
  --samples N --warmup N   Timed samples and untimed warmups (defaults: 15/5 single, 5/3 suite)
  --seed TEXT              Used with --shape random
  --n --p --q --crown-height --a --b --c  Family geometry parameters for --shape
  --palette --color --background --yaw --pitch --zoom --face-index  Render parameters
  --json                   Print machine-readable JSON instead of a table
  --output PATH            Also write the JSON report to a file
  --compare PATH           Compare against a report from the same machine and settings

Timings separate uncached geometry, cached mesh lookup, CPU raster stages, complete scene,
PNG encoding, and full PNG generation. Infinite families are sampled at valid small,
medium, and large parameter values; use --shape and parameters for any other member.
The FPS column is a single-thread CPU ceiling, not measured browser display FPS.`;
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!name?.startsWith("--")) throw new Error(`Unexpected argument: ${name}`);
    const key = name.slice(2);
    if (FLAGS.has(key)) { args.set(key, true); continue; }
    if (!VALUES.has(key)) throw new Error(`Unknown option: ${name}`);
    const value = argv[++i];
    if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a value`);
    args.set(key, value);
  }
  return args;
}

function numberArg(args, key, fallback, min, max, integer = false) {
  if (!args.has(key)) return fallback;
  const value = Number(args.get(key));
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`--${key} must be ${integer ? "an integer" : "a number"} from ${min} to ${max}`);
  }
  return value;
}

function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return { median: sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2,
    p95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)], min: sorted[0], max: sorted.at(-1) };
}

function measure(fn, samples, warmup) {
  for (let i = 0; i < warmup; i++) fn();
  const times = [];
  let result;
  for (let i = 0; i < samples; i++) {
    const started = performance.now();
    result = fn();
    times.push(performance.now() - started);
  }
  return { result, ...summary(times) };
}
function timingsOnly({ result, ...timings }) { return timings; }

function checksum(image) {
  let hash = 2166136261;
  for (const value of image.data) hash = Math.imul(hash ^ value, 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function runCase(item, renderOptions, samples, warmup) {
  const shapeOptions = { shape: item.shape, ...item.params };
  const sceneOptions = { ...shapeOptions, ...renderOptions };
  const resolved = resolveSceneOptions(sceneOptions);
  const defaults = seededDefaults(resolved.seed);
  const rasterOptions = { ...resolved, palette: resolved.palette ?? defaults.palette,
    yaw: resolved.yaw ?? defaults.yaw, pitch: resolved.pitch ?? (resolved.view === "face" ? 0 : defaults.pitch) };
  clearRenderCaches();
  const coldStarted = performance.now();
  const mesh = createPolyhedron(shapeOptions);
  const geometryColdMs = performance.now() - coldStarted;
  const geometry = measure(() => createPolyhedron(shapeOptions), samples, warmup);
  const cache = createGeometryCache(1);
  const cacheBuild = measure(() => cache.get(shapeOptions), 1, 0);
  const cacheLookup = measure(() => cache.get(shapeOptions), samples, warmup);
  const profiles = [];
  const profileOptions = { ...rasterOptions, onTiming: value => profiles.push(value) };
  const coldRasterStarted = performance.now();
  renderPolyhedron(mesh, profileOptions);
  const rasterColdMs = performance.now() - coldRasterStarted;
  profiles.length = 0;
  const raster = measure(() => renderPolyhedron(mesh, profileOptions), samples, warmup);
  const sampledProfiles = profiles.slice(warmup);
  const stages = Object.fromEntries(["setupMs", "backgroundMs", "facesMs", "edgesMs", "downsampleMs", "totalMs"]
    .map(key => [key, summary(sampledProfiles.map(value => value[key]))]));
  const scene = measure(() => renderScene(sceneOptions), samples, warmup);
  if (checksum(scene.result) !== checksum(raster.result)) throw new Error("Direct raster and complete scene pixels differ");
  const pngEncode = measure(() => encodePng(raster.result), samples, warmup);
  const pngFull = measure(() => renderPng(sceneOptions), samples, warmup);
  return {
    id: item.shape, label: item.label, group: item.group, parameters: item.params,
    vertices: mesh.vertices.length, edges: mesh.edges.length, faces: mesh.faces.length,
    geometryColdMs, geometry: timingsOnly(geometry), cacheBuild: timingsOnly(cacheBuild),
    cacheLookup: timingsOnly(cacheLookup), rasterColdMs, raster: timingsOnly(raster), stages,
    backgroundCacheHit: sampledProfiles.every(value => value.backgroundCacheHit),
    scene: timingsOnly(scene), pngEncode: timingsOnly(pngEncode), pngFull: timingsOnly(pngFull),
    checksum: checksum(raster.result), pngBytes: pngEncode.result.length, fullPngBytes: pngFull.result.length,
    internalMegapixelsPerSecond: renderOptions.width * renderOptions.height * renderOptions.quality ** 2 / raster.median / 1000,
    cpuFpsCeiling: 1000 / scene.median, rssMiB: process.memoryUsage().rss / 1048576,
  };
}

function format(number, digits = 1) { return Number.isFinite(number) ? number.toFixed(digits) : "—"; }
function printTable(report) {
  const { settings, rows } = report;
  process.stdout.write(`CPU benchmark · ${settings.width}×${settings.height} · ${settings.quality}× supersampling · ${settings.view} · ${settings.samples} samples\n`);
  process.stdout.write(`Node ${report.environment.node} · ${report.environment.cpu} · ${report.environment.platform}/${report.environment.arch}\n`);
  process.stdout.write("Form                                  V/F  Mesh   Raster   BG  Faces Edges Down  Scene    PNG  FPS*\n");
  for (const row of rows) {
    if (row.error) { process.stdout.write(`${row.label.slice(0, 36).padEnd(36)}  ERROR ${row.error}\n`); continue; }
    const counts = `${row.vertices}/${row.faces}`.padStart(5);
    process.stdout.write(`${row.label.slice(0, 36).padEnd(36)} ${counts} ${format(row.geometry.median).padStart(5)} ${format(row.raster.median).padStart(8)} ${format(row.stages.backgroundMs.median).padStart(5)} ${format(row.stages.facesMs.median).padStart(6)} ${format(row.stages.edgesMs.median).padStart(5)} ${format(row.stages.downsampleMs.median).padStart(5)} ${format(row.scene.median).padStart(6)} ${format(row.pngFull.median).padStart(6)} ${format(row.cpuFpsCeiling).padStart(5)}\n`);
  }
  const slowest = rows.filter(row => !row.error).sort((a, b) => b.raster.median - a.raster.median).slice(0, 5);
  process.stdout.write(`\n${rows.length} cases, ${rows.filter(row => row.error).length} failures, ${format(report.elapsedMs / 1000, 2)} s elapsed. Slowest raster cases: ${slowest.map(row => `${row.label} ${format(row.raster.median)}ms`).join(", ")}\n`);
  if (report.comparison) {
    const compared = rows.filter(row => row.comparison);
    const largestRegression = [...compared].sort((a, b) => b.comparison.rasterPercent - a.comparison.rasterPercent).slice(0, 5);
    const matchingPixels = compared.filter(row => row.comparison.pixelMatch).length;
    process.stdout.write(`Compared with ${report.comparison.path}: ${compared.length} matching cases, ${matchingPixels}/${compared.length} pixel checksums match. Largest raster changes: ${largestRegression.map(row => `${row.label} ${row.comparison.rasterPercent >= 0 ? "+" : ""}${format(row.comparison.rasterPercent)}%`).join(", ")}\n`);
  }
  process.stdout.write("*FPS is a CPU single-thread ceiling from complete scene timing; browser draw/presentation and GPU are not measured here. JSON includes p95, cold times, cache timings, checksums, and memory.\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.has("help")) { process.stdout.write(usage() + "\n"); return; }
  if (args.has("list")) { for (const item of SHAPES) process.stdout.write(`${item.id}\t${item.family}\n`);
    for (const item of FAMILY_CASES) process.stdout.write(`${item.shape}\t${item.label}\n`); return; }
  const selections = [args.has("all"), args.has("shape"), args.has("family")].filter(Boolean).length;
  if (selections > 1) throw new Error("Choose only one of --all, --shape, or --family");
  const suite = args.has("all") || args.has("family");
  const geometryKeys = ["n", "p", "q", "crown-height", "a", "b", "c"];
  if (suite && geometryKeys.some(key => args.has(key))) throw new Error("Geometry overrides require --shape");
  let cases;
  if (args.has("all")) {
    const finite = SHAPES.filter(item => item.family === "Finite");
    if (finite.length !== 146 || IMPLEMENTED_FINITE_COUNT !== 146) throw new Error(`Expected all 146 finite forms, found ${finite.length}`);
    cases = [...finite.map(item => ({ shape: item.id, label: item.id, group: "finite", params: {} })),
      ...FAMILY_CASES.map(item => ({ ...item, label: `${item.shape} ${item.label}`, group: "family" }))];
  } else if (args.has("family")) {
    const family = args.get("family");
    if (!["all", "disphenoid", "stephanoid", "antistephanoid"].includes(family)) throw new Error(`Unknown family: ${family}`);
    cases = FAMILY_CASES.filter(item => family === "all" || item.shape === family)
      .map(item => ({ ...item, label: `${item.shape} ${item.label}`, group: "family" }));
  } else {
    const shape = args.get("shape") ?? "cube";
    if (shape !== "random" && !SHAPES.some(item => item.id === shape)) throw new Error(`Unknown form: ${shape}`);
    const params = {};
    for (const key of geometryKeys) if (args.has(key)) params[key === "crown-height" ? "crownHeight" : key] = numberArg(args, key, 0, 0.01, 1000);
    if (args.has("seed")) params.seed = args.get("seed");
    cases = [{ shape, label: `${shape}${Object.keys(params).length ? ` ${JSON.stringify(params)}` : ""}`, group: shape === "random" ? "random" : SHAPES.find(item => item.id === shape)?.family, params }];
  }
  const width = numberArg(args, "width", suite ? 256 : 512, 1, 8192, true);
  const height = numberArg(args, "height", width, 1, 8192, true);
  const quality = numberArg(args, "quality", 2, 1, 2, true);
  if (width * height * quality * quality > 64_000_000) throw new Error("Image exceeds the 64 million internal pixel budget");
  const samples = numberArg(args, "samples", suite ? 5 : 15, 1, 100, true);
  const warmup = numberArg(args, "warmup", suite ? 3 : 5, 0, 50, true);
  const view = args.get("view") ?? "solid-wireframe";
  if (!VIEWS.has(view)) throw new Error(`Unknown view: ${view}`);
  const material = args.get("material") ?? "studio";
  if (!MATERIAL_NAMES.includes(material)) throw new Error(`Unknown material: ${material}`);
  const renderOptions = { width, height, quality, view, material };
  for (const key of ["palette", "color", "background"]) if (args.has(key)) renderOptions[key] = args.get(key);
  for (const key of ["yaw", "pitch", "zoom", "face-index"]) if (args.has(key)) renderOptions[key === "face-index" ? "faceIndex" : key] = numberArg(args, key, 0, key === "face-index" ? 0 : -100, 100);
  // Prime shared JIT paths before the first catalogue row; this is outside all timings.
  const primer = createPolyhedron({ shape: "cube" });
  for (let i = 0; i < 8; i++) renderPolyhedron(primer, { width: Math.min(width, 512), height: Math.min(height, 512), quality, view: "solid-wireframe" });
  for (let i = 0; i < 3; i++) encodePng(renderScene({ shape: "cube", width: 64, height: 64, quality }));
  clearRenderCaches();
  let gitCommit;
  try { gitCommit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* No Git checkout. */ }
  const report = { schema: 1, generatedAt: new Date().toISOString(), gitCommit,
    environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model ?? "unknown",
      logicalCpus: cpus().length, totalMemoryGiB: totalmem() / 1073741824 },
    settings: { width, height, quality, view, samples, warmup, backend: "cpu",
      renderOptions: Object.fromEntries(Object.entries(renderOptions).filter(([key]) => !["width", "height", "quality", "view"].includes(key))) },
    rows: [], elapsedMs: 0 };
  const started = performance.now();
  for (const item of cases) {
    try { report.rows.push(runCase(item, renderOptions, samples, warmup)); }
    catch (error) { report.rows.push({ id: item.shape, label: item.label, group: item.group, parameters: item.params,
      error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; }
  }
  report.elapsedMs = performance.now() - started;
  if (args.has("compare")) {
    const path = args.get("compare");
    const baseline = JSON.parse(await readFile(path, "utf8"));
    for (const key of ["width", "height", "quality", "view", "backend"]) {
      const previous = key === "backend" ? baseline.settings?.backend ?? "cpu" : baseline.settings?.[key];
      if (previous !== report.settings[key]) throw new Error(`Baseline ${key} differs; use matching benchmark settings`);
    }
    if (JSON.stringify(baseline.settings?.renderOptions ?? {}) !== JSON.stringify(report.settings.renderOptions)) {
      throw new Error("Baseline render options differ; use matching colors, camera, and face settings");
    }
    for (const key of ["platform", "arch", "cpu"]) {
      if (baseline.environment?.[key] !== report.environment[key]) throw new Error(`Baseline ${key} differs; compare reports from the same machine`);
    }
    const rowKey = row => JSON.stringify([row.id, row.parameters]);
    const oldRows = new Map(baseline.rows.filter(row => !row.error).map(row => [rowKey(row), row]));
    for (const row of report.rows) {
      const old = oldRows.get(rowKey(row));
      if (!row.error && old) row.comparison = {
        rasterPercent: (row.raster.median / old.raster.median - 1) * 100,
        scenePercent: (row.scene.median / old.scene.median - 1) * 100,
        fullPngPercent: (row.pngFull.median / old.pngFull.median - 1) * 100,
        pixelMatch: row.checksum === old.checksum,
      };
    }
    report.comparison = { path, gitCommit: baseline.gitCommit };
  }
  if (args.has("output")) await writeFile(args.get("output"), JSON.stringify(report, null, 2) + "\n");
  if (args.has("json")) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else printTable(report);
}

main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage()}\n`); process.exitCode = 1; });
