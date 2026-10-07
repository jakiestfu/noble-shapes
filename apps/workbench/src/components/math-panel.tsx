import type { Polyhedron } from "@noble-polyhedra/core";
import { MathText } from "@/components/math-text";
import { eulerCharacteristic } from "@/lib/shape-math";

export default function MathPanel({ poly, regularSymbol }: { poly: Polyhedron; regularSymbol?: string }) {
  return <div className="math-panel-content"><div><p className="showcase-kicker">Abstract face cycles</p><MathText tex={`(V,E,F)=(${poly.vertices.length},${poly.edges.length},${poly.faces.length})`} /></div><div><p className="showcase-kicker">Euler characteristic</p><MathText tex={`\\chi=${poly.vertices.length}-${poly.edges.length}+${poly.faces.length}=${eulerCharacteristic(poly)}`} /></div>{regularSymbol && <div><p className="showcase-kicker">Schläfli symbol</p><MathText tex={regularSymbol} /></div>}<p className="math-note">Counts follow the abstract faces and edges; visible crossings do not create extra vertices.</p></div>;
}
