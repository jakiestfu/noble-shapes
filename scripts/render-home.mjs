import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { savePng } from "../packages/node/dist/index.js";
import { DEFAULT_DESIGN_OPTIONS } from "../packages/render/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(await readFile(resolve(root, "apps/workbench/src/lib/home-scenes.json"), "utf8"));
const output = resolve(root, "apps/workbench/public/home");
await mkdir(output, { recursive: true });

for (const scene of scenes) {
  const file = resolve(output, `${scene.shape}.png`);
  await savePng(file, {
    shape: scene.shape,
    view: DEFAULT_DESIGN_OPTIONS.view,
    material: DEFAULT_DESIGN_OPTIONS.material,
    color: DEFAULT_DESIGN_OPTIONS.color,
    background: "transparent",
    width: 900,
    height: 900,
    quality: 2,
    yaw: scene.yaw,
    pitch: scene.pitch,
  });
  console.log(`Rendered ${file}`);
}
