import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { renderPng } from "@noble-shapes/node";
import { DEFAULT_DESIGN_OPTIONS } from "@noble-shapes/render";

const app = join(dirname(fileURLToPath(import.meta.url)), "../app");
const home = join(dirname(fileURLToPath(import.meta.url)), "../public/home");
const design = DEFAULT_DESIGN_OPTIONS;

const icon = Buffer.from(renderPng({ ...design, width: 512, height: 512, quality: 1 }));
await writeFile(join(app, "icon.png"), icon);
await writeFile(join(app, "apple-icon.png"), await sharp(icon).resize(180, 180).png().toBuffer());

const sizes = [16, 32, 48, 256];
const images = await Promise.all(sizes.map(size => sharp(icon).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, image] of images.entries()) {
  const entry = 6 + index * 16;
  header.writeUInt8(sizes[index] === 256 ? 0 : sizes[index], entry);
  header.writeUInt8(sizes[index] === 256 ? 0 : sizes[index], entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
}
await writeFile(join(app, "favicon.ico"), Buffer.concat([header, ...images]));

await writeFile(join(home, "default.png"), renderPng({ ...design, background: "transparent", width: 720, height: 720, quality: 1 }));
