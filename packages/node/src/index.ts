import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
import { renderScene, type RenderedImage, type SceneOptions } from "@noble-polyhedra/render";

const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: Uint8Array): Uint8Array {
  const result = new Uint8Array(payload.length + 12);
  const view = new DataView(result.buffer);
  view.setUint32(0, payload.length);
  for (let i = 0; i < 4; i++) result[4 + i] = type.charCodeAt(i);
  result.set(payload, 8);
  view.setUint32(result.length - 4, crc32(result.subarray(4, result.length - 4)));
  return result;
}

/** PNG encoder using only Node's built-in zlib. */
export function encodePng(image: RenderedImage): Uint8Array {
  const { width, height, data } = image;
  if (data.length !== width * height * 4) throw new Error("RGBA buffer length does not match dimensions");
  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rows.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  const chunks = [signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", new Uint8Array())];
  const total = chunks.reduce((sum, bytes) => sum + bytes.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const bytes of chunks) { png.set(bytes, offset); offset += bytes.length; }
  return png;
}

export function renderPng(options: SceneOptions = {}): Uint8Array {
  return encodePng(renderScene(options));
}

export async function savePng(path: string, options: SceneOptions = {}): Promise<void> {
  await writeFile(path, renderPng(options));
}
