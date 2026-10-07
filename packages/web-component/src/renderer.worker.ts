import { seededDefaults } from "@noble-polyhedra/core";
import { createGeometryCache, renderPolyhedron, type RenderTimings, type SceneOptions } from "@noble-polyhedra/render";

const geometry = createGeometryCache(4);

self.onmessage = (event: MessageEvent<{ id: number; options: SceneOptions }>) => {
  const { id, options } = event.data;
  try {
    const geometryStarted = performance.now();
    const defaults = seededDefaults(options.seed);
    const { polyhedron, hit: meshCacheHit } = geometry.get(options);
    const geometryMs = performance.now() - geometryStarted;
    let stages: RenderTimings | undefined;
    const renderStarted = performance.now();
    const image = renderPolyhedron(polyhedron, {
      ...options,
      palette: options.palette ?? defaults.palette,
      yaw: options.yaw ?? defaults.yaw,
      pitch: options.pitch ?? (options.view === "face" ? 0 : defaults.pitch),
      onTiming: timings => { stages = timings; },
    });
    self.postMessage({ id, width: image.width, height: image.height, buffer: image.data.buffer,
      renderMs: performance.now() - renderStarted, geometryMs, meshCacheHit, stages,
      vertices: polyhedron.vertices.length,
      edges: polyhedron.edges.length, faces: polyhedron.faces.length }, { transfer: [image.data.buffer] });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
