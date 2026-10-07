import { createPolyhedron, type Polyhedron, type ShapeOptions } from "@noble-shapes/core";

/** Reuse geometry while camera, palette, view, and dimensions change. */
export function createGeometryCache(maxEntries = 8): {
  get(options: ShapeOptions): { polyhedron: Polyhedron; hit: boolean };
  clear(): void;
} {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("Geometry cache size must be a positive integer");
  const entries = new Map<string, Polyhedron>();
  const keyFor = (options: ShapeOptions): string => {
    const shape = options.shape ?? "random";
    if (shape === "disphenoid") return JSON.stringify([shape, options.a ?? 1.15, options.b ?? 0.9, options.c ?? 0.75]);
    if (shape === "stephanoid" || shape === "antistephanoid") return JSON.stringify([shape, options.n ?? 5,
      options.p ?? (shape === "stephanoid" ? 3 : 2), options.q ?? 1, options.crownHeight ?? 0.7]);
    if (shape === "random") return JSON.stringify([shape, options.seed ?? "noble", options.n, options.p, options.q,
      options.crownHeight, options.a, options.b, options.c]);
    return shape;
  };
  return {
    get(options) {
      const key = keyFor(options);
      const cached = entries.get(key);
      if (cached) {
        entries.delete(key);
        entries.set(key, cached);
        return { polyhedron: cached, hit: true };
      }
      const polyhedron = createPolyhedron(options);
      entries.set(key, polyhedron);
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
      return { polyhedron, hit: false };
    },
    clear() { entries.clear(); },
  };
}
