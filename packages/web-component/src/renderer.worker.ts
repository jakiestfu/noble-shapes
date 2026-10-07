import { createPolyhedron, seededDefaults } from "@noble-polyhedra/core";
import { renderPolyhedron, type SceneOptions } from "@noble-polyhedra/render";

self.onmessage = (event: MessageEvent<{ id: number; options: SceneOptions }>) => {
  const { id, options } = event.data;
  try {
    const start = performance.now();
    const defaults = seededDefaults(options.seed);
    const polyhedron = createPolyhedron(options);
    const image = renderPolyhedron(polyhedron, {
      ...options,
      palette: options.palette ?? defaults.palette,
      yaw: options.yaw ?? defaults.yaw,
      pitch: options.pitch ?? (options.view === "face" ? 0 : defaults.pitch),
    });
    self.postMessage({ id, width: image.width, height: image.height, buffer: image.data.buffer,
      renderMs: performance.now() - start, vertices: polyhedron.vertices.length,
      edges: polyhedron.edges.length, faces: polyhedron.faces.length }, { transfer: [image.data.buffer] });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
