import type { Polyhedron, ShapeId } from "@noble-shapes/core";

/** Schläfli notation applies to these regular solids, including the four regular stars. */
export const REGULAR_SYMBOLS: Partial<Record<ShapeId, string>> = {
  tetrahedron: "\\{3,3\\}",
  cube: "\\{4,3\\}",
  octahedron: "\\{3,4\\}",
  dodecahedron: "\\{5,3\\}",
  icosahedron: "\\{3,5\\}",
  "small-stellated-dodecahedron": "\\left\\{\\frac{5}{2},5\\right\\}",
  "great-dodecahedron": "\\left\\{5,\\frac{5}{2}\\right\\}",
  "great-stellated-dodecahedron": "\\left\\{\\frac{5}{2},3\\right\\}",
  "great-icosahedron": "\\left\\{3,\\frac{5}{2}\\right\\}",
};

/** Uses the abstract face cycles: visual crossings are not added as vertices. */
export function eulerCharacteristic(polyhedron: Polyhedron): number {
  return polyhedron.vertices.length - polyhedron.edges.length + polyhedron.faces.length;
}
