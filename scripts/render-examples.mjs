import { mkdir } from "node:fs/promises";
import { createPolyhedron, SHAPES } from "../packages/core/dist/index.js";
import { savePng } from "../packages/node/dist/index.js";

await mkdir("renders", { recursive: true });
const palettes = ["gold", "coral", "aurora", "violet"];
for (const [index, { id }] of SHAPES.entries()) {
  const poly = createPolyhedron({ shape: id });
  await savePng(`renders/${id}.png`, { shape: id, seed: `gallery-${index}`, palette: palettes[index % palettes.length], width: 600, height: 600, yaw: 0.55, pitch: 0.72 });
  console.log(`${id}: ${poly.vertices.length} vertices, ${poly.edges.length} edges, ${poly.faces.length} faces`);
}
for (const view of ["solid", "wireframe", "face", "face-context"]) {
  await savePng(`renders/great-stellated-dodecahedron-${view}.png`, {
    shape: "great-stellated-dodecahedron", view, palette: "gold", width: 600, height: 600, yaw: 0.6, pitch: view === "face" ? 0 : 0.72,
  });
}
for (const view of ["face", "face-context"]) {
  await savePng(`renders/great-dodecahedron-${view}.png`, {
    shape: "great-dodecahedron", view, palette: "gold", width: 600, height: 600, yaw: 0.6, pitch: view === "face" ? 0 : 0.72,
  });
}
