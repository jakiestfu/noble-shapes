import sharp from "sharp";
import { SHAPES } from "@noble-shapes/core";
import { renderPng } from "@noble-shapes/node";
import { DEFAULT_DESIGN_OPTIONS, PALETTES, type DesignOptions } from "@noble-shapes/render";

const WIDTH = 1200;
const HEIGHT = 630;

export type PageCard = "default" | "create" | "showcase" | "research" | "documentation";

export const PAGE_CARDS: Record<PageCard, { title: string; subtitle: string; design: DesignOptions }> = {
  default: { title: "Noble Shapes", subtitle: "Explore 146 finite forms and two infinite families.", design: DEFAULT_DESIGN_OPTIONS },
  create: { title: "Create a noble shape", subtitle: "Choose a form, shape its appearance, and share your design.", design: DEFAULT_DESIGN_OPTIONS },
  showcase: { title: "Shape showcase", subtitle: "A closer look at remarkable noble polyhedra.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "great-stellated-dodecahedron", palette: "coral", color: PALETTES.coral.color, background: PALETTES.coral.background } },
  research: { title: "The mathematics", subtitle: "One kind of vertex. One kind of face.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "icosahedron", palette: "gold", color: PALETTES.gold.color, background: PALETTES.gold.background } },
  documentation: { title: "Build with Noble Shapes", subtitle: "Web components, Node images, a CLI, and a JavaScript API.", design: { ...DEFAULT_DESIGN_OPTIONS, shape: "dodecahedron", palette: "violet", color: PALETTES.violet.color, background: PALETTES.violet.background } },
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function titleLines(title: string): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 19) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 4);
}

/** Branded card shared by static page previews and dynamic design previews. */
export async function renderOgCard(design: DesignOptions, title: string, subtitle: string): Promise<Buffer> {
  const background = design.background === "transparent" ? PALETTES[design.palette].background : design.background;
  const titleColor = "#f6f7f4";
  const lines = titleLines(title);
  const fontSize = lines.length > 2 ? 54 : 61;
  const lineHeight = 1.07 * fontSize;
  const titleY = 270 - (lines.length - 1) * 26;
  const safeTitle = lines.map((line, index) => `<tspan x="70" y="${Math.round(titleY + index * lineHeight)}">${escapeXml(line)}</tspan>`).join("");
  const backdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><defs><radialGradient id="glow"><stop stop-color="${escapeXml(design.color)}" stop-opacity=".27"/><stop offset="1" stop-color="${escapeXml(background)}" stop-opacity="0"/></radialGradient><linearGradient id="veil"><stop stop-color="${escapeXml(background)}" stop-opacity=".94"/><stop offset=".57" stop-color="${escapeXml(background)}" stop-opacity=".2"/><stop offset="1" stop-color="${escapeXml(background)}" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="${escapeXml(background)}"/><ellipse cx="855" cy="290" rx="490" ry="490" fill="url(#glow)"/></svg>`);
  const shape = Buffer.from(renderPng({ ...design, background: "transparent", width: 700, height: 630, quality: 1 }));
  const foreground = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="veil"><stop stop-color="${escapeXml(background)}" stop-opacity=".98"/><stop offset=".55" stop-color="${escapeXml(background)}" stop-opacity=".75"/><stop offset="1" stop-color="${escapeXml(background)}" stop-opacity="0"/></linearGradient></defs><rect width="775" height="630" fill="url(#veil)"/><text x="70" y="100" fill="${titleColor}" font-family="Arial,DejaVu Sans,sans-serif" font-size="24" font-weight="700" letter-spacing="5">NOBLE SHAPES</text><text fill="${titleColor}" font-family="Arial,DejaVu Sans,sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-1.5">${safeTitle}</text><text x="70" y="${Math.max(405, Math.round(titleY + (lines.length - 1) * lineHeight + 70))}" fill="#ffffffb8" font-family="Arial,DejaVu Sans,sans-serif" font-size="22">${escapeXml(subtitle)}</text><line x1="70" x2="1130" y1="555" y2="555" stroke="#ffffff55"/><text x="70" y="592" fill="#ffffffa8" font-family="Arial,DejaVu Sans,sans-serif" font-size="18" letter-spacing="1.5">NOBLESHAP.ES</text></svg>`);
  return sharp(backdrop).composite([{ input: shape, left: 500, top: 0 }, { input: foreground, left: 0, top: 0 }]).png().toBuffer();
}

export function shapeName(design: DesignOptions): string {
  return SHAPES.find(shape => shape.id === design.shape)?.name ?? "Noble polyhedron";
}
