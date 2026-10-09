import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { createPolyhedron, SHAPES, type ShapeId, type ShapeOptions } from "@noble-shapes/core";
import { PALETTES, renderScene, type PaletteName, type RenderView } from "@noble-shapes/render";

export interface VideoChapter {
  label: string;
  title: string;
  body: string;
}

export interface VideoOptions {
  shape: ShapeId;
  shapeParameters?: Omit<ShapeOptions, "shape" | "seed">;
  title?: string;
  classification?: string;
  notation?: string;
  faceName?: string;
  faceIndex?: number;
  chapters?: VideoChapter[];
  resolution?: "720p" | "1080p" | "4k";
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  palette?: PaletteName;
  color?: string;
  background?: string;
  view?: RenderView;
  yaw?: number;
  pitch?: number;
  /** Rotation rate in turns per sequence duration. */
  turns?: number;
  /** Number of times to play the introduction, lessons, and complete face tour. */
  loops?: number;
  /** Share of each sequence reserved for the face tour. */
  faceTourFraction?: number;
  /** Share of each sequence reserved for the introduction. */
  introFraction?: number;
  /** Blend time between sections, in seconds. */
  crossfadeSeconds?: number;
  /** Vertical travel in pixels at 1080p. */
  floatPixels?: number;
  /** Small pitch oscillation in radians. */
  pitchSwing?: number;
  zoom?: number;
  quality?: 1 | 2;
  ffmpegPath?: string;
}

export interface VideoResult {
  videoPath: string;
  posterPath: string;
  frames: number;
  width: number;
  height: number;
}

const RESOLUTIONS = { "720p": [1280, 720], "1080p": [1920, 1080], "4k": [3840, 2160] } as const;
const HEX = /^#[0-9a-f]{6}$/i;
interface ProgressSegment { start: number; end: number; x: number; width: number; label: string }
const REGULAR_NOTATION: Partial<Record<ShapeId, string>> = {
  tetrahedron: "{3, 3}", cube: "{4, 3}", octahedron: "{3, 4}",
  dodecahedron: "{5, 3}", icosahedron: "{3, 5}",
  "small-stellated-dodecahedron": "{5/2, 5}",
  "great-dodecahedron": "{5, 5/2}",
  "great-stellated-dodecahedron": "{5/2, 3}",
  "great-icosahedron": "{3, 5/2}",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function wrap(value: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of value.trim().split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= max) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

function textLines(value: string, x: number, y: number, size: number, leading: number, max: number, fill: string, weight = 400): string {
  return wrap(value, max).map((line, index) =>
    `<text x="${x}" y="${y + index * leading}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`).join("");
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

function svg(content: string, width: number, height: number): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1920 1080">${content}</svg>`);
}

function backgroundSvg(background: string, accent: string): string {
  return `<defs>
    <radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".14"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="${background}"/>
  <ellipse cx="1290" cy="485" rx="650" ry="610" fill="url(#glow)"/>
  <path d="M90 108h1740M90 979h1740" stroke="${accent}" stroke-opacity=".19" stroke-width="1"/>`;
}

function progressSegments(chapterCount: number, introFraction: number, faceTourFraction: number, secondsPerLoop: number): ProgressSegment[] {
  const lessonEnd = 1 - faceTourFraction;
  const starts = [0, introFraction,
    ...Array.from({ length: chapterCount }, (_, index) => introFraction + (index + 1) * (lessonEnd - introFraction) / chapterCount), 1];
  const gap = 8;
  const available = 612 - gap * (starts.length - 2);
  let x = 90;
  return starts.slice(0, -1).map((start, index) => {
    const end = starts[index + 1]!;
    const width = available * (end - start);
    const name = index === 0 ? "INTRO" : index === starts.length - 2 ? "FACES" : String(index).padStart(2, "0");
    const segment = { start, end, x, width, label: `${name}  ${((end - start) * secondsPerLoop).toFixed(1)}S` };
    x += width + gap;
    return segment;
  });
}

function drawProgress(rgb: Buffer, width: number, segments: readonly ProgressSegment[], section: number, progress: number, color: string): void {
  const scale = width / 1920;
  const y = Math.round(1020 * scale);
  const height = Math.max(2, Math.round(7 * scale));
  const [red, green, blue] = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    const amount = index < section ? 1 : index === section ? Math.max(0, Math.min(1, progress)) : 0;
    const left = Math.round(segment.x * scale);
    const filled = Math.round(segment.width * scale * amount);
    for (let row = y; row < y + height; row++) for (let column = left; column < left + filled; column++) {
      const offset = (row * width + column) * 3;
      rgb[offset] = red!;
      rgb[offset + 1] = green!;
      rgb[offset + 2] = blue!;
    }
  }
}

function crossfade(first: Buffer, second: Buffer, amount: number): Buffer {
  const output = Buffer.allocUnsafe(first.length);
  const remaining = 1 - amount;
  for (let index = 0; index < output.length; index++) output[index] = first[index]! * remaining + second[index]! * amount;
  return output;
}

function overlaySvg(options: { title: string; classification: string; faceName: string; notation: string; notationLabel: string },
  chapter: VideoChapter, index: number, total: number, counts: { vertices: number; edges: number; faces: number },
  accent: string, background: string, light: boolean, segments: readonly ProgressSegment[]): string {
  const ink = light ? "#162027" : "#f7f7f8";
  const muted = light ? "#52616a" : "#acabbc";
  const title = wrap(options.title, 18).slice(0, 3);
  const titleSize = title.length > 2 ? 57 : 65;
  const titleLeading = title.length > 2 ? 63 : 73;
  const titleText = title.map((line, lineIndex) => `<text x="90" y="${226 + lineIndex * titleLeading}" fill="${ink}" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="600" letter-spacing="-2">${escapeXml(line)}</text>`).join("");
  const longTitle = wrap(chapter.title, 25).length > 1;
  const chapterTitle = textLines(chapter.title, 90, 709, 44, 52, 25, ink, 600);
  const chapterBody = textLines(chapter.body, 90, longTitle ? 815 : 777, 26, 38, 45, muted);
  const labels = [["VERTICES", counts.vertices], ["EDGES", counts.edges], ["FACES", counts.faces]] as const;
  const stats = labels.map(([label, count], i) => {
    const x = 90 + i * 206;
    return `${i > 0 ? `<path d="M${x - 20} 401v75" stroke="${accent}" stroke-opacity=".22"/>` : ""}
      <text x="${x}" y="414" fill="${muted}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="1.7">${label}</text>
      <text x="${x}" y="464" fill="${ink}" font-family="Arial, sans-serif" font-size="43" font-weight="600">${count}</text>`;
  }).join("");
  const progress = segments.map(segment => `<text x="${segment.x}" y="1009" fill="${muted}" font-family="Arial, sans-serif" font-size="13" font-weight="600" letter-spacing=".8">${escapeXml(segment.label)}</text>
    <rect x="${segment.x}" y="1020" width="${segment.width}" height="7" rx="3.5" fill="${ink}" fill-opacity=".18"/>`).join("");
  return `<text x="90" y="76" fill="${ink}" font-family="Arial, sans-serif" font-size="23" font-weight="600" letter-spacing="1.5">NOBLE SHAPES</text>
    <text x="1830" y="76" fill="${muted}" font-family="Arial, sans-serif" font-size="16" font-weight="600" text-anchor="end" letter-spacing="2">FIELD NOTES  /  GEOMETRY</text>
    <text x="90" y="161" fill="${accent}" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2.2">${escapeXml(options.classification.toUpperCase())}</text>
    ${titleText}
    <path d="M90 367h612M90 495h612" stroke="${accent}" stroke-opacity=".22" stroke-width="1"/>
    ${stats}
    <text x="90" y="540" fill="${muted}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">${options.notationLabel}</text>
    <text x="90" y="592" fill="${accent}" font-family="Georgia, serif" font-size="46" font-style="italic">${escapeXml(options.notation)}</text>
    <path d="M90 636h52" stroke="${accent}" stroke-width="3"/>
    <text x="158" y="642" fill="${accent}" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2">${escapeXml(chapter.label.toUpperCase())}</text>
    ${chapterTitle}${chapterBody}
    <rect x="1495" y="739" width="345" height="236" rx="5" fill="${background}" fill-opacity=".9"/>
    <path d="M1495 739h345" stroke="${accent}" stroke-opacity=".55"/>
    <text x="1519" y="771" fill="${accent}" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1.5">ONE FACE / FLAT VIEW</text>
    <text x="1519" y="956" fill="${ink}" font-family="Georgia, serif" font-size="23" font-style="italic">${escapeXml(options.faceName)}</text>
    <text x="90" y="1053" fill="${muted}" font-family="Arial, sans-serif" font-size="19">Explore this shape at nobleshap.es/3d</text>
    <text x="1830" y="1053" fill="${muted}" font-family="Arial, sans-serif" font-size="18" text-anchor="end">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>
    ${progress}`;
}

function requireFinite(value: number, label: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return value;
}

/** Render a deterministic educational clip and its poster, using FFmpeg only for encoding. */
export async function renderVideo(options: VideoOptions, destination: string,
  onProgress?: (frame: number, total: number) => void): Promise<VideoResult> {
  const entry = SHAPES.find(item => item.id === options.shape);
  if (!entry) throw new Error(`Unknown shape: ${options.shape}`);
  const polyhedron = createPolyhedron({ ...options.shapeParameters, shape: options.shape });
  const palette = options.palette ?? "aurora";
  if (!(palette in PALETTES)) throw new Error(`Unknown palette: ${palette}`);
  const color = options.color ?? PALETTES[palette].color;
  const background = options.background ?? PALETTES[palette].background;
  if (!HEX.test(color) || !HEX.test(background)) throw new Error("Video colors must be six-digit hex values");
  const preset = RESOLUTIONS[options.resolution ?? "1080p"];
  if (!preset) throw new Error(`Unknown resolution: ${options.resolution}`);
  const width = options.width ?? preset[0], height = options.height ?? preset[1];
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 640 || height < 360 || width > 3840 || height > 2160
    || Math.abs(width / height - 16 / 9) > 0.015 || width % 2 || height % 2) {
    throw new Error("Video dimensions must be even, 16:9, and between 640x360 and 3840x2160");
  }
  const duration = requireFinite(options.duration ?? 48, "Duration", 1, 600);
  const fps = requireFinite(options.fps ?? 24, "FPS", 1, 60);
  if (!Number.isInteger(fps)) throw new Error("FPS must be an integer");
  const loops = requireFinite(options.loops ?? 1, "Loops", 1, 8);
  if (!Number.isInteger(loops)) throw new Error("Loops must be an integer");
  const frames = Math.round(duration * fps);
  const framesPerLoop = frames / loops;
  const introFraction = requireFinite(options.introFraction ?? 0.18, "Intro fraction", 0.05, 0.5);
  const faceTourFraction = requireFinite(options.faceTourFraction ?? 0.28, "Face tour fraction", 0.1, 0.8);
  if (introFraction + faceTourFraction >= 0.9) throw new Error("Introduction and face tour must leave at least 10% for lessons");
  const crossfadeSeconds = requireFinite(options.crossfadeSeconds ?? 0.6, "Crossfade", 0, 2);
  const faceFrames = framesPerLoop * faceTourFraction / polyhedron.faces.length;
  if (faceFrames < 6) throw new Error("Duration and FPS must allow at least six frames per face in every loop");
  const yaw = requireFinite(options.yaw ?? 0.55, "Yaw", -100, 100);
  const pitch = requireFinite(options.pitch ?? 0.68, "Pitch", -1.5, 1.5);
  const turns = requireFinite(options.turns ?? 0.4, "Turns", -20, 20);
  const floatPixels = requireFinite(options.floatPixels ?? 12, "Float", 0, 200);
  const pitchSwing = requireFinite(options.pitchSwing ?? 0.07, "Pitch swing", 0, 1);
  const zoom = requireFinite(options.zoom ?? 1.05, "Zoom", 0.2, 2);
  const quality = options.quality ?? 1;
  if (quality !== 1 && quality !== 2) throw new Error("Quality must be 1 or 2");
  const faceIndex = options.faceIndex ?? 0;
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= polyhedron.faces.length) throw new Error("Face index is outside the shape's face range");
  const title = options.title ?? entry.name;
  if (options.chapters !== undefined && (!Array.isArray(options.chapters) || options.chapters.length > 8)) {
    throw new Error("Chapters must be an array of at most eight entries");
  }
  const chapters = options.chapters?.length ? options.chapters : [
    { label: "01 / THE FORM", title: "A noble polyhedron", body: "Its symmetry can carry any vertex to any other and any face to any other." },
    { label: "02 / ONE FACE", title: "Look at the face", body: `One of its ${polyhedron.faces.length} faces is shown separately at right.` },
    { label: "03 / THE COUNT", title: "Count the structure", body: `${polyhedron.vertices.length} vertices, ${polyhedron.edges.length} edges, and ${polyhedron.faces.length} faces define this form.` },
  ];
  if (chapters.some(chapter => typeof chapter.label !== "string" || typeof chapter.title !== "string" || typeof chapter.body !== "string"
    || !chapter.label.trim() || !chapter.title.trim() || !chapter.body.trim()
    || chapter.label.length > 32 || chapter.title.length > 45 || chapter.body.length > 110)) {
    throw new Error("Every chapter needs a short label, title, and body that fit the video layout");
  }
  const notation = options.notation ?? REGULAR_NOTATION[options.shape];
  const labels = { title, classification: options.classification ?? entry.family,
    notation: notation ?? options.shape, notationLabel: notation ? "SCHLÄFLI SYMBOL" : "CATALOGUE ID",
    faceName: options.faceName ?? `Face ${faceIndex + 1}` };
  if (labels.title.length > 48 || labels.classification.length > 40 || labels.notation.length > 24 || labels.faceName.length > 28) {
    throw new Error("One of the video labels is too long for the layout");
  }
  const scale = width / 1920;
  const light = luminance(background) > 0.35;
  const backgroundImage = await sharp(svg(backgroundSvg(background, color), width, height)).png().toBuffer();
  const faceSize = Math.round(154 * scale);
  const face = renderScene({ ...options.shapeParameters, shape: options.shape, faceIndex, view: "face", yaw: 0, pitch: 0,
    palette, color, background: "transparent", width: faceSize, height: faceSize, quality: 2 });
  const faceBuffer = Buffer.from(face.data.buffer, face.data.byteOffset, face.data.byteLength);
  const counts = { vertices: polyhedron.vertices.length, edges: polyhedron.edges.length, faces: polyhedron.faces.length };
  const segments = progressSegments(chapters.length, introFraction, faceTourFraction, duration / loops);
  const intro: VideoChapter = { label: "INTRODUCTION", title: "Explore the form", body: `A turn reveals ${counts.faces} congruent faces. Then we will highlight every one.` };
  const lessonOverlays = await Promise.all([intro, ...chapters].map(async (chapter, index) => sharp(svg(overlaySvg(labels, chapter, index,
    chapters.length + 2, counts, color, background, light, segments), width, height))
    .composite([{ input: faceBuffer, raw: { width: faceSize, height: faceSize, channels: 4 },
      left: Math.round(1593 * scale), top: Math.round(789 * scale) }]).png().toBuffer()));
  const faceOverlays = await Promise.all(polyhedron.faces.map(async (_, index) => {
    const chapter: VideoChapter = {
      label: `FACE ${String(index + 1).padStart(2, "0")} / ${String(counts.faces).padStart(2, "0")}`,
      title: "One face at a time",
      body: "The shape keeps turning. Each highlighted face matches the flat face at right.",
    };
    return sharp(svg(overlaySvg(labels, chapter, chapters.length + 1, chapters.length + 2,
      counts, color, background, light, segments), width, height))
      .composite([{ input: faceBuffer, raw: { width: faceSize, height: faceSize, channels: 4 },
        left: Math.round(1593 * scale), top: Math.round(789 * scale) }]).png().toBuffer();
  }));
  const heroSize = Math.round(940 * scale);
  const heroLeft = Math.round(795 * scale);
  const heroTop = Math.round(48 * scale);
  const output = resolve(destination);
  if (!output.endsWith(".mp4")) throw new Error("Video output must end in .mp4");
  await mkdir(dirname(output), { recursive: true });
  const temporary = join(dirname(output), `.${basename(output)}.${process.pid}.partial.mp4`);
  const posterPath = output.slice(0, -4) + ".png";
  const encoder = spawn(options.ffmpegPath ?? "ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
    "-pix_fmt", "rgb24", "-video_size", `${width}x${height}`, "-framerate", String(fps), "-i", "pipe:0",
    "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", temporary], { stdio: ["pipe", "ignore", "pipe"] });
  let encoderError = "";
  encoder.stderr.setEncoding("utf8").on("data", (chunk: string) => { encoderError += chunk.slice(-4000); });
  const exit = new Promise<void>((done, fail) => {
    encoder.on("error", fail);
    encoder.on("close", code => code === 0 ? done() : fail(new Error(`FFmpeg exited ${code}: ${encoderError.trim()}`)));
  });
  try {
    const shortestSection = Math.min(...segments.map(segment => segment.end - segment.start));
    const fadeFraction = Math.min(crossfadeSeconds / (duration / loops), shortestSection * 0.8);
    for (let frame = 0; frame < frames; frame++) {
      const loopPosition = frame / framesPerLoop;
      const loopProgress = loopPosition - Math.floor(loopPosition);
      const section = segments.findIndex(segment => loopProgress >= segment.start && loopProgress < segment.end);
      const active = segments[section]!;
      const sectionProgress = (loopProgress - active.start) / (active.end - active.start);
      const faceStart = segments.at(-1)!.start;
      const facePosition = Math.max(0, Math.min(counts.faces - Number.EPSILON,
        (loopProgress - faceStart) / (1 - faceStart) * counts.faces));
      const selectedFace = Math.floor(facePosition);
      const currentYaw = yaw + loopPosition * Math.PI * 2 * turns;
      const currentPitch = pitch + Math.sin(loopPosition * Math.PI * 2) * pitchSwing;
      const float = Math.round(Math.sin(loopPosition * Math.PI * 4) * floatPixels * scale);
      const renderSection = async (index: number, selected: number): Promise<Buffer> => {
        const inStudy = index === segments.length - 1;
        const overlay = inStudy ? faceOverlays[selected]! : lessonOverlays[index]!;
        const hero = renderScene({ ...options.shapeParameters, shape: options.shape,
          view: inStudy ? "face-context" : options.view ?? "solid-wireframe",
          faceIndex: inStudy ? selected : faceIndex,
          palette, color, background: "transparent", yaw: currentYaw,
          pitch: currentPitch, zoom,
          width: heroSize, height: heroSize, quality });
        const heroBuffer = Buffer.from(hero.data.buffer, hero.data.byteOffset, hero.data.byteLength);
        return sharp(backgroundImage).composite([
          { input: heroBuffer, raw: { width: heroSize, height: heroSize, channels: 4 }, left: heroLeft, top: heroTop + float },
          { input: overlay, left: 0, top: 0 },
        ]).removeAlpha().raw().toBuffer();
      };
      let fade: { previous: number; next: number; amount: number } | undefined;
      if (fadeFraction > 0) for (let next = 0; next < segments.length; next++) {
        const boundary = segments[next]!.start;
        let distance = loopProgress - boundary;
        if (distance > 0.5) distance -= 1;
        if (distance < -0.5) distance += 1;
        if (Math.abs(distance) >= fadeFraction / 2 || (next === 0 && frame < framesPerLoop * fadeFraction / 2)) continue;
        fade = { previous: (next + segments.length - 1) % segments.length, next,
          amount: (distance + fadeFraction / 2) / fadeFraction };
        break;
      }
      const rgb = fade
        ? crossfade(
          await renderSection(fade.previous, fade.previous === segments.length - 1 ? counts.faces - 1 : 0),
          await renderSection(fade.next, 0), fade.amount)
        : await renderSection(section, selectedFace);
      drawProgress(rgb, width, segments, section, sectionProgress, color);
      if (frame === Math.floor(framesPerLoop * 0.25)) await writeFile(posterPath, await sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer());
      if (!encoder.stdin.write(rgb)) await once(encoder.stdin, "drain");
      onProgress?.(frame + 1, frames);
    }
    encoder.stdin.end();
    await exit;
    await rename(temporary, output);
  } catch (error) {
    encoder.kill();
    await rm(temporary, { force: true });
    throw error;
  }
  return { videoPath: output, posterPath, frames, width, height };
}
