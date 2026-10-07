import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { savePng } from "../packages/node/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(await readFile(resolve(root, "apps/workbench/src/lib/showcase-scenes.json"), "utf8"));
const output = resolve(root, "apps/workbench/public/showcase");
await mkdir(output, { recursive: true });

for (const scene of scenes) {
  const file = resolve(output, `${scene.shape}.png`);
  await savePng(file, {
    shape: scene.shape,
    palette: scene.palette,
    view: "solid-wireframe",
    width: 960,
    height: 640,
    quality: 2,
    yaw: scene.yaw,
    pitch: scene.pitch,
    n: scene.n,
    p: scene.p,
    q: scene.q,
  });
  console.log(`Rendered ${file}`);
}
