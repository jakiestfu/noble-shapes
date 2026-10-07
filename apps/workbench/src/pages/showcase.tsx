import { createElement } from "react";
import { ArrowUpRight } from "lucide-react";
import { SHAPES, type ShapeId } from "@noble-polyhedra/core";
import { DEFAULT_WORKBENCH_OPTIONS, PALETTES, type PaletteName, type WorkbenchOptions } from "@noble-polyhedra/render";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/math-text";
import { REGULAR_SYMBOLS } from "@/lib/shape-math";

type Favorite = { shape: ShapeId; palette: PaletteName; yaw: number; pitch: number; note: string };

const FAVORITES: Favorite[] = [
  { shape: "small-stellated-dodecahedron", palette: "aurora", yaw: 0.6, pitch: 0.72, note: "A star of long, crossing pentagonal faces." },
  { shape: "great-dodecahedron", palette: "gold", yaw: -0.36, pitch: 0.5, note: "A quieter silhouette with hidden depth." },
  { shape: "great-stellated-dodecahedron", palette: "coral", yaw: 0.55, pitch: 0.68, note: "Sharp points and a dramatic, layered surface." },
  { shape: "great-icosahedron", palette: "violet", yaw: -0.7, pitch: 0.58, note: "Angular facets that change character as it turns." },
];

export function Showcase({ theme, onOpen }: { theme: WorkbenchOptions["theme"]; onOpen: (options: WorkbenchOptions) => void }) {
  return <main className="content-page"><div className="content-inner">
    <div className="page-heading"><div><p className="eyebrow">Curated forms</p><h1 className="section-title">Showcase</h1><p className="page-description">Four favorites from the Kepler–Poinsot solids. Open any form in the workbench to change its color, view, and motion.</p></div><span className="page-count">01 — 04</span></div>
    <div className="showcase-grid">{FAVORITES.map((favorite, index) => {
      const name = SHAPES.find(shape => shape.id === favorite.shape)?.name ?? favorite.shape;
      const palette = PALETTES[favorite.palette];
      return <article className="showcase-card" key={favorite.shape}>
        <div className="showcase-stage" style={{ backgroundColor: palette.background }}>
          {createElement("noble-polyhedron", { shape: favorite.shape, view: "solid-wireframe", palette: favorite.palette, color: palette.color, background: palette.background, yaw: String(favorite.yaw), pitch: String(favorite.pitch), className: "showcase-model", "aria-label": name })}
          <span className="showcase-number">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="showcase-card-body"><div><p className="showcase-kicker">Kepler–Poinsot solid</p><div className="showcase-heading-row"><h2 className="showcase-name">{name}</h2><MathText className="showcase-symbol" tex={REGULAR_SYMBOLS[favorite.shape]!} /></div><p className="showcase-note">{favorite.note}</p></div>
          <Button variant="outline" size="sm" onClick={() => onOpen({ ...DEFAULT_WORKBENCH_OPTIONS, shape: favorite.shape, palette: favorite.palette, color: palette.color, background: palette.background, yaw: favorite.yaw, pitch: favorite.pitch, theme })}>Open in workbench <ArrowUpRight className="size-3.5" /></Button>
        </div>
      </article>;
    })}</div>
  </div></main>;
}
