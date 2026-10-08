import sharp from "sharp";
import opentype, { type Font } from "opentype.js";
import { SHAPES } from "@noble-shapes/core";
import { renderPng } from "@noble-shapes/node";
import { DEFAULT_DESIGN_OPTIONS, PALETTES, type DesignOptions } from "@noble-shapes/render";
import { OG_FONT_BOLD, OG_FONT_REGULAR } from "./og-fonts.ts";

const WIDTH = 1200;
const HEIGHT = 630;
function parseFont(data: string): Font {
  const bytes = Buffer.from(data, "base64");
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const regularFont = parseFont(OG_FONT_REGULAR);
const boldFont = parseFont(OG_FONT_BOLD);
export const PLAYGROUND_DESCRIPTION = "A playground for exploring finite and infinite noble polyhedra.";

export type PageCard = "default" | "create" | "showcase" | "research" | "documentation";

export const PAGE_CARDS: Record<PageCard, { title: string; subtitle?: string; design: DesignOptions }> = {
  default: { title: PLAYGROUND_DESCRIPTION, design: DEFAULT_DESIGN_OPTIONS },
  create: { title: "Create 3D", subtitle: "Choose a noble polyhedron, shape its appearance, and share your design.", design: DEFAULT_DESIGN_OPTIONS },
  showcase: { title: "Shape showcase", subtitle: "A closer look at remarkable noble polyhedra.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "great-stellated-dodecahedron", palette: "coral", color: PALETTES.coral.color, background: PALETTES.coral.background } },
  research: { title: "The mathematics", subtitle: "One kind of vertex. One kind of face.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "icosahedron", palette: "gold", color: PALETTES.gold.color, background: PALETTES.gold.background } },
  documentation: { title: "Developer tools", subtitle: "Web components, Node images, a CLI, and a JavaScript API.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "dodecahedron", palette: "violet", color: PALETTES.violet.color, background: PALETTES.violet.background } },
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}

function blend(from: string, to: string, amount: number): string {
  const a = rgb(from);
  const b = rgb(to);
  return `#${a.map((channel, index) => Math.round(channel * (1 - amount) + b[index]! * amount).toString(16).padStart(2, "0")).join("")}`;
}

function isLight(hex: string): boolean {
  const [red, green, blue] = rgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722 > 0.35;
}

function wrapText(value: string, font: Font, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    const last = lines.length - 1;
    const candidate = last < 0 ? word : `${lines[last]} ${word}`;
    if (last >= 0 && font.getAdvanceWidth(candidate, fontSize) <= maxWidth) lines[last] = candidate;
    else lines.push(word);
  }
  return lines;
}

function svgText(value: string, font: Font, size: number, x: number, y: number, color: string): string {
  return font.getPaths(value, x, y, size)
    .map(path => {
      const data = path.toPathData(2);
      if (data.includes("NaN")) throw new Error("Open Graph font produced an invalid glyph path");
      return `<path d="${data}" fill="${escapeXml(color)}"/>`;
    }).join("");
}

function svgLayer(content: string): Promise<Buffer> {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${content}</svg>`);
  return sharp(svg).png().toBuffer();
}

/** A profile-style card shared by page images and encoded design previews. */
export async function renderOgCard(design: DesignOptions, title: string, subtitle?: string): Promise<Buffer> {
  const background = design.background === "transparent" ? PALETTES[design.palette].background : design.background;
  const light = isLight(background);
  const outer = blend(background, "#000000", light ? 0.08 : 0.18);
  const border = blend(background, light ? "#000000" : "#ffffff", light ? 0.12 : 0.16);
  const heading = light ? "#162027" : "#f7f7f8";
  const muted = light ? "#4e5860" : "#b3b7bd";
  const accentSize = subtitle ? 43 : 36;
  const accentLines = wrapText(title, boldFont, accentSize, 605);
  const subtitleSize = 22;
  const subtitleLines = subtitle ? wrapText(subtitle, regularFont, subtitleSize, 600) : [];
  const brandHeight = 74;
  const accentHeight = accentLines.length * 52;
  const subtitleHeight = subtitleLines.length * 31;
  const subtitleGap = subtitle ? 12 : 0;
  const badgeHeight = 45;
  const stackHeight = brandHeight + 20 + accentHeight + subtitleGap + subtitleHeight + 20 + badgeHeight;
  const stackTop = (HEIGHT - stackHeight) / 2;
  const brandY = stackTop + 61;
  const accentY = stackTop + brandHeight + 20 + 37;
  const subtitleY = stackTop + brandHeight + 20 + accentHeight + subtitleGap + 23;
  const badgeY = stackTop + stackHeight - badgeHeight;
  const backdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <rect width="1200" height="630" fill="${outer}"/>
    <rect x="28" y="28" width="1144" height="574" rx="27" fill="${background}" stroke="${border}" stroke-width="2"/>
  </svg>`);
  const shape = Buffer.from(renderPng({ ...design, background: "transparent", width: 475, height: 475, quality: 1 }));
  const badge = await svgLayer(`
    <rect x="526" y="${badgeY}" width="190" height="${badgeHeight}" rx="22.5" fill="${escapeXml(design.color)}" fill-opacity=".1" stroke="${escapeXml(design.color)}" stroke-opacity=".36"/>
    <path d="M684 ${badgeY + 22.5}h19m-7-7 7 7-7 7" fill="none" stroke="${escapeXml(design.color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const textLayers = await Promise.all([
    svgText("Noble Shapes", boldFont, 62, 526, brandY, heading),
    ...accentLines.map((line, index) => svgText(line, boldFont, accentSize, 526, accentY + index * 52, design.color)),
    ...subtitleLines.map((line, index) => svgText(line, regularFont, subtitleSize, 526, subtitleY + index * 31, muted)),
    svgText("Explore now", boldFont, 21, 548, badgeY + 29, design.color),
  ].map(svgLayer));
  return sharp(backdrop).composite([
    { input: shape, left: 27, top: 78 }, { input: badge, left: 0, top: 0 },
    ...textLayers.map(input => ({ input, left: 0, top: 0 })),
  ]).png().toBuffer();
}

export function shapeName(design: DesignOptions): string {
  return SHAPES.find(shape => shape.id === design.shape)?.name ?? "Noble polyhedron";
}
