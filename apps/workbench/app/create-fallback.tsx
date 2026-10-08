import type { CSSProperties } from "react";
import { SHAPES } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS } from "@noble-shapes/render";
import { PRODUCT } from "@/lib/resources";

const defaultShape = SHAPES.find(shape => shape.id === DEFAULT_DESIGN_OPTIONS.shape)?.name ?? "Noble polyhedron";

/** Static first paint while the interactive editor and GPU renderer initialize. */
export function CreateFallback() {
  return <div className="app-shell is-workbench create-fallback" style={{ "--scene-background": DEFAULT_DESIGN_OPTIONS.background, "--scene-color": DEFAULT_DESIGN_OPTIONS.color } as CSSProperties}>
    <header className="app-header">
      <div className="brand-lockup"><a className="brand-product" href="/">{PRODUCT.name}</a></div>
      <nav className="app-nav" aria-label="Main navigation">
        <a className="app-nav-link is-active" href="/3d" aria-current="page">Create 3D</a>
        <a className="app-nav-link" href="/showcase">Showcase</a>
        <a className="app-nav-link" href="/research">Research</a>
        <a className="app-nav-link" href="/documentation">Docs</a>
      </nav>
    </header>
    <div className="app-layout">
      <aside className="control-panel"><div className="control-intro"><h1 className="font-heading text-xl font-bold tracking-tight">Create 3D</h1><p className="mt-1 text-xs text-muted-foreground">146 finite polyhedra · two infinite families</p></div></aside>
      <main className="preview-panel">
        <div className="preview-toolbar"><h2 className="preview-toolbar-title">{defaultShape}</h2></div>
        <div className="preview-surface"><img className="create-fallback-image" src="/home/default.png" alt={defaultShape} width="720" height="720" fetchPriority="high" /></div>
      </main>
    </div>
  </div>;
}
