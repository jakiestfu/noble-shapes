#!/usr/bin/env node
import { savePng } from "./index.js";
import type { SceneOptions } from "@noble-polyhedra/render";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write("Usage: noble-render --out image.png [--shape id] [--view solid|solid-wireframe|wireframe|face|face-context] [--face-index number] [--seed text] [--palette name] [--width px] [--height px] [--n number] [--p number] [--q number]\n");
  process.exit(0);
}
const values = new Map<string, string>();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i], value = args[i + 1];
  if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --option value near ${key}`);
  values.set(key.slice(2), value);
}
const output = values.get("out");
if (!output) throw new Error("--out is required");
const numeric = (key: string): number | undefined => values.has(key) ? Number(values.get(key)) : undefined;
const options: SceneOptions = {
  shape: values.get("shape") as SceneOptions["shape"],
  seed: values.get("seed"),
  palette: values.get("palette") as SceneOptions["palette"],
  color: values.get("color"),
  background: values.get("background"),
  view: values.get("view") as SceneOptions["view"],
  faceIndex: numeric("face-index"),
  width: numeric("width"), height: numeric("height"),
  n: numeric("n"), p: numeric("p"), q: numeric("q"), crownHeight: numeric("crown-height"),
  yaw: numeric("yaw"), pitch: numeric("pitch"), zoom: numeric("zoom"),
};
await savePng(output, options);
process.stdout.write(`Saved ${output}\n`);
