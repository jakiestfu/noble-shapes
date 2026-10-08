import type { CSSProperties } from "react";
import { PRODUCT } from "@/lib/resources";

/** Static first paint while the interactive editor and GPU renderer initialize. */
export function CreateFallback() {
  return <div className="app-shell is-workbench create-fallback" style={{ "--scene-background": "#07131d", "--scene-color": "#5ce0d3" } as CSSProperties}>
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
        <div className="preview-toolbar"><h2 className="preview-toolbar-title">Small stellated dodecahedron</h2></div>
        <div className="preview-surface"><img className="create-fallback-image" src="/home/small-stellated-dodecahedron.png" alt="Small stellated dodecahedron" width="720" height="720" fetchPriority="high" /></div>
      </main>
    </div>
  </div>;
}
