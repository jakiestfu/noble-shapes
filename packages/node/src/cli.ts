#!/usr/bin/env node
import { savePng } from "./index.js";
import type { SceneOptions } from "@noble-shapes/render";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`Usage: noble-shapes (or noble-render) --out image.png [options]

  --shape id             Catalogue ID or infinite-family name
  --random identity      Generate a repeatable design; explicit options override it
  --seed text            Seed used for default camera orientation
  --view name            solid, solid-wireframe, wireframe, face, or face-context
  --material studio      Surface style
  --face-index number    Repeated face to show in face views
  --palette name         Preset color palette
  --color hex            Facet color, for example #5ce0d3
  --background hex       Background color or transparent
  --width px             Image width (1–8192)
  --height px            Image height (1–8192)
  --yaw number           Horizontal camera angle
  --pitch number         Vertical camera angle
  --zoom number          Camera zoom
  --rotation x,y,z,w     Camera quaternion
  --a, --b, --c number   Disphenoid axis lengths
  --n, --p, --q number   Stephanoid crown parameters
  --crown-height number  Stephanoid crown height
  --help                 Show this help
`);
  process.exit(0);
}
const values = new Map<string, string>();
const allowed = new Set(["out", "shape", "random", "seed", "view", "material", "face-index", "palette", "color", "background", "width", "height", "yaw", "pitch", "zoom", "rotation", "a", "b", "c", "n", "p", "q", "crown-height"]);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i], value = args[i + 1];
  if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --option value near ${key}`);
  if (!allowed.has(key.slice(2))) throw new Error(`Unknown option ${key}`);
  values.set(key.slice(2), value);
}
const output = values.get("out");
if (!output) throw new Error("--out is required");
const numeric = (key: string): number | undefined => {
  if (!values.has(key)) return undefined;
  const value = Number(values.get(key));
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a finite number`);
  return value;
};
const rotation = values.get("rotation")?.split(",").map(Number);
if (rotation && (rotation.length !== 4 || rotation.some(value => !Number.isFinite(value)))) {
  throw new Error("--rotation must have four finite comma-separated numbers");
}
const options: SceneOptions = {
  random: values.get("random"),
  shape: values.get("shape") as SceneOptions["shape"],
  seed: values.get("seed"),
  palette: values.get("palette") as SceneOptions["palette"],
  color: values.get("color"),
  background: values.get("background"),
  view: values.get("view") as SceneOptions["view"],
  material: values.get("material") as SceneOptions["material"],
  faceIndex: numeric("face-index"),
  width: numeric("width"), height: numeric("height"),
  n: numeric("n"), p: numeric("p"), q: numeric("q"), crownHeight: numeric("crown-height"),
  a: numeric("a"), b: numeric("b"), c: numeric("c"),
  yaw: numeric("yaw"), pitch: numeric("pitch"), zoom: numeric("zoom"),
  rotation: rotation as SceneOptions["rotation"],
};
await savePng(output, options);
process.stdout.write(`Saved ${output}\n`);
