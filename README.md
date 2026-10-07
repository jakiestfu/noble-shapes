# Noble Polyhedra

A TypeScript workspace for deterministic images of noble polyhedra. It includes an independently generated finite catalogue, examples of the two infinite families, a shared browser and Node image renderer, a native web component, and an interactive workbench.

## Start

```sh
pnpm install
pnpm dev
```

Open the local address printed by Vite. To build, check the geometry, and generate sample PNGs:

```sh
pnpm test
pnpm render:examples
```

The workbench form picker starts with named solids, then lets you browse icosahedral and octahedral forms, infinite families, all forms, or recently viewed forms. Typing a name or catalogue ID searches across every collection.

## Use the web component

Install `@noble-polyhedra/web-component` in a bundled web project and import it once:

```ts
import "@noble-polyhedra/web-component";
```

```html
<noble-polyhedron
  shape="small-stellated-dodecahedron"
  seed="my-avatar"
  palette="aurora"
  view="face-context"
  face-index="0"
  stats
  yaw="0.6"
  pitch="0.72"
></noble-polyhedron>
```

Use `shape="random"` with a stable `seed` for a repeatable shape, camera angle, and palette. Drag the image to rotate; scroll to zoom. Named shapes include the five Platonic solids and the four Kepler–Poinsot solids: `small-stellated-dodecahedron`, `great-dodecahedron`, `great-stellated-dodecahedron`, and `great-icosahedron`. `disphenoid`, `stephanoid`, and `antistephanoid` cover the families. Families accept `a`, `b`, `c` (disphenoid) or `n`, `p`, `q`, `crown-height` (stephanoids). The `color` and `background` attributes accept six-digit hex colors.

The `view` attribute selects `solid` (shaded mesh), `solid-wireframe` (shaded with visible abstract edges, the default), `wireframe` (all edges), `face` (one isolated repeated face), or `face-context` (one face highlighted over the complete wireframe). `face-index` selects which congruent face to inspect.

Drag with a mouse or touch pointer for screen-space 3D trackball rotation. The resulting `rotation` attribute is a unit quaternion in `x,y,z,w` order, so an adjusted view can be copied into another embed. Changing `yaw` or `pitch` in the workbench resets the trackball orientation. During a drag the browser renders a smaller frame on a worker, then produces a full-resolution frame on release. The optional `stats` attribute (or `element.stats = true` property) displays completed draw FPS (zero while idle), render and presentation times, input-to-image latency, canvas dimensions, pixel count, geometry counts, quality, and backend. The `noble-render` event exposes the same metrics in `event.detail`.

## Render in Node

```ts
import { savePng } from "@noble-polyhedra/node";

await savePng("avatar.png", {
  shape: "random",
  seed: "person-42",
  palette: "violet",
  view: "wireframe",
  width: 512,
  height: 512,
});
```

The command-line renderer is also available after building:

```sh
node packages/node/dist/cli.js --shape stephanoid --palette coral --out crown.png
```

The Node package writes PNG with Node's built-in compression. The browser and Node both use the same pure TypeScript depth-buffered renderer, so the pixels match for identical settings. No browser or native canvas dependency is required for image generation. The workbench uses local shadcn/ui components with the light theme tokens mirrored from `jakiestfu-next/packages/ui`.

## Mathematical scope

The core implements all 146 classified finite forms and exports `KNOWN_FINITE_COUNT` and `IMPLEMENTED_FINITE_COUNT` (both 146). It also supports the disphenoid and stephanoid families (including prismatic and antiprismatic crowns). The core keeps ordered mathematical face cycles separate from rendering. Valid crown parameters follow Hill's definitions; tuples that generate disconnected compounds are rejected.

Self-crossing face interiors use an even-odd fill rule for display. That rule is a visual convention; the ordered vertices and abstract edges remain the source of mathematical topology. See [Geometry and catalogue notes](docs/geometry.md).

The implementation is original and MIT licensed. It uses the mathematical descriptions in [Connor Hill's paper](https://arxiv.org/abs/2607.28711) and does not include code or model files from the GPL-3.0 [`noble-tools-revised` repository](https://github.com/Plasmath/noble-tools-revised).
