#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ShapeId } from "@noble-shapes/core";
import type { PaletteName, RenderView } from "@noble-shapes/render";
import { renderVideo, type VideoOptions } from "./index.js";

const help = `Noble Shapes video renderer

Usage: pnpm --filter @noble-shapes/video render --config lesson.json --output lesson.mp4 [options]

Options:
  --shape ID             Catalogue shape ID
  --resolution SIZE      720p, 1080p, or 4k
  --width N --height N   Custom 16:9 dimensions, up to 3840x2160
  --duration SECONDS     Length of the video
  --fps N                Frames per second
  --yaw N --pitch N      Starting camera angles in radians
  --turns N              Rotation rate in turns per sequence
  --loops N              Repeat the introduction, lessons, and face tour
  --intro-fraction N     Share of each sequence for the introduction
  --face-tour-fraction N Share of each sequence for the face tour
  --crossfade-seconds N  Blend time between sections
  --float-pixels N       Vertical float at 1080p
  --pitch-swing N        Pitch oscillation in radians
  --zoom N               Model scale
  --face-index N         Static face shown in the corner
  --view NAME            solid, solid-wireframe, or wireframe
  --palette NAME         Noble Shapes palette
  --color HEX            Model and accent color
  --background HEX       Video background color
  --quality N            Renderer supersampling, 1 or 2
  --title TEXT           Override the catalogue name
  --classification TEXT  Form label
  --notation TEXT        Mathematical notation label
  --face-name TEXT       Name under the static face
  --ffmpeg PATH          FFmpeg binary (default: ffmpeg on PATH)
  --help                 Show this help

The config file can also set chapters and shapeParameters. CLI flags override it.
`;

const numericFlags = new Map<string, keyof VideoOptions>([
  ["width", "width"], ["height", "height"], ["duration", "duration"], ["fps", "fps"],
  ["yaw", "yaw"], ["pitch", "pitch"], ["turns", "turns"], ["float-pixels", "floatPixels"],
  ["pitch-swing", "pitchSwing"], ["zoom", "zoom"], ["face-index", "faceIndex"], ["quality", "quality"],
  ["loops", "loops"], ["intro-fraction", "introFraction"], ["face-tour-fraction", "faceTourFraction"],
  ["crossfade-seconds", "crossfadeSeconds"],
]);
const textFlags = new Map<string, keyof VideoOptions>([
  ["title", "title"], ["classification", "classification"], ["notation", "notation"],
  ["face-name", "faceName"], ["color", "color"], ["background", "background"], ["ffmpeg", "ffmpegPath"],
]);

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes("--help")) { process.stdout.write(help); return; }
  const flags = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --option value near ${key ?? "end of command"}`);
    flags.set(key.slice(2), value);
  }
  const configPath = flags.get("config");
  const config = configPath ? JSON.parse(await readFile(resolve(configPath), "utf8")) as VideoOptions : {} as VideoOptions;
  const options: VideoOptions = { ...config };
  for (const [flag, property] of numericFlags) {
    const value = flags.get(flag);
    if (value !== undefined) Object.assign(options, { [property]: Number(value) });
  }
  for (const [flag, property] of textFlags) {
    const value = flags.get(flag);
    if (value !== undefined) Object.assign(options, { [property]: value });
  }
  if (flags.has("shape")) options.shape = flags.get("shape") as ShapeId;
  if (flags.has("palette")) options.palette = flags.get("palette") as PaletteName;
  if (flags.has("view")) options.view = flags.get("view") as RenderView;
  if (flags.has("resolution")) options.resolution = flags.get("resolution") as VideoOptions["resolution"];
  const recognized = new Set(["config", "output", "shape", "palette", "view", "resolution", ...numericFlags.keys(), ...textFlags.keys()]);
  for (const flag of flags.keys()) if (!recognized.has(flag)) throw new Error(`Unknown option --${flag}`);
  if (!options.shape) throw new Error("Specify a shape in --config or with --shape");
  const output = flags.get("output") ?? `renders/video/${options.shape}.mp4`;
  let lastPercent = -1;
  const result = await renderVideo(options, output, (frame, total) => {
    const percent = Math.floor(frame / total * 10) * 10;
    if (percent > lastPercent) { process.stderr.write(`Rendered ${percent}% (${frame}/${total})\n`); lastPercent = percent; }
  });
  process.stdout.write(`Video: ${result.videoPath}\nPoster: ${result.posterPath}\n${result.width}x${result.height}, ${result.frames} frames\n`);
}

main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
