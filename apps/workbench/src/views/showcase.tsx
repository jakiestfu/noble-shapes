import { ArrowUpRight } from "lucide-react";
import { SHAPES, type ShapeId } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS, optionsToString, PALETTES, type PaletteName } from "@noble-shapes/render";
import { MathText } from "@/components/math-text";
import { REGULAR_SYMBOLS } from "@/lib/shape-math";
import scenes from "@/lib/showcase-scenes.json";

export function Showcase() {
  return <main className="content-page"><div className="content-inner">
    <div className="page-heading"><div><p className="eyebrow">Curated shapes</p><h1 className="section-title">Showcase</h1><p className="page-description">A few ways nobility can look, from the regular stars to newer facetings and an infinite family. Select a shape to open its design in Create.</p></div><span className="page-count">01 — {String(scenes.length).padStart(2, "0")}</span></div>
    <div className="showcase-grid">{scenes.map((scene, index) => {
      const shape = scene.shape as ShapeId;
      const palette = scene.palette as PaletteName;
      const name = SHAPES.find(item => item.id === shape)?.name ?? shape;
      const colors = PALETTES[palette];
      const code = optionsToString({ ...DEFAULT_DESIGN_OPTIONS, shape, palette,
        color: colors.color, background: colors.background,
        n: scene.n ?? DEFAULT_DESIGN_OPTIONS.n, p: scene.p ?? DEFAULT_DESIGN_OPTIONS.p, q: scene.q ?? DEFAULT_DESIGN_OPTIONS.q });
      const symbol = REGULAR_SYMBOLS[shape];
      return <a className="showcase-card" href={`/create?code=${encodeURIComponent(code)}`} key={shape}>
        <div className="showcase-stage" style={{ backgroundColor: colors.background }}>
          <img className="showcase-image" src={`/showcase/${shape}.png`} alt="" loading={index < 2 ? "eager" : "lazy"} decoding="async" width="960" height="640" />
          <span className="showcase-number">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="showcase-card-body">
          <p className="showcase-kicker">{scene.category}</p>
          <div className="showcase-heading-row"><h2 className="showcase-name">{name}</h2>{symbol && <MathText className="showcase-symbol" tex={symbol} />}<ArrowUpRight className="showcase-arrow" aria-hidden="true" /></div>
          <p className="showcase-note">{scene.note}</p>
        </div>
      </a>;
    })}</div>
  </div></main>;
}
