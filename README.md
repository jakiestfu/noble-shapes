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

The full-screen studio has a searchable form picker, a separate **Surprise me** action, light and dark modes, and a shareable URL. Every visual control is encoded in the URL; the renderer stats toggle is local to the browser. The homepage is the workbench, with separate Showcase and Research pages.

The workbench's **Form mathematics** section uses KaTeX on demand to show the selected form's computed vertex, edge, and face counts and Euler characteristic, `χ = V − E + F`. The nine regular forms also show their Schläfli symbols; those symbols do not apply to the rest of the noble catalogue. Counts follow abstract face cycles, so visible self-intersections do not add vertices or edges. The four Showcase favorites display their Schläfli symbols alongside their names.

## Share a complete design

```ts
import { DEFAULT_WORKBENCH_OPTIONS, optionsToString, stringToOptions } from "@noble-polyhedra/render";

const code = optionsToString({ ...DEFAULT_WORKBENCH_OPTIONS, background: "transparent" });
const options = stringToOptions(code);
```

Design codes begin with `np1_` and contain the form, view, palette, colors, optional transparent background, orientation, zoom, repeated face, family dimensions, motion, and studio theme. Decoding validates the version and geometry. The studio writes the code to the `code` URL parameter as controls change; pasting a code into the sidebar restores it. **Surprise me** randomizes the visual options and creates a new code. Renderer stats are intentionally excluded.

## Use the web component

Install `@noble-polyhedra/web-component` in a bundled web project and import it once:

```ts
import "@noble-polyhedra/web-component";
```

```html
<noble-polyhedron
  shape="small-stellated-dodecahedron"
  palette="aurora"
  view="face-context"
  face-index="0"
  stats
  rotate="0.35"
  float="0.5"
  yaw="0.6"
  pitch="0.72"
></noble-polyhedron>
```

Drag the image to rotate; scroll to zoom. Named shapes include the five Platonic solids and the four Kepler–Poinsot solids: `small-stellated-dodecahedron`, `great-dodecahedron`, `great-stellated-dodecahedron`, and `great-icosahedron`. `disphenoid`, `stephanoid`, and `antistephanoid` cover the families. Families accept `a`, `b`, `c` (disphenoid) or `n`, `p`, `q`, `crown-height` (stephanoids). The `color` attribute accepts a six-digit hex color; `background` accepts a six-digit hex color or `transparent`.

The `view` attribute selects `solid` (shaded mesh), `solid-wireframe` (shaded with visible abstract edges, the default), `wireframe` (all edges), `face` (one isolated repeated face), or `face-context` (one face highlighted over the complete wireframe). `face-index` selects which congruent face to inspect.

Drag with a mouse or touch pointer for screen-space 3D trackball rotation. The resulting `rotation` attribute is a unit quaternion in `x,y,z,w` order, so an adjusted view can be copied into another embed. Changing `yaw` or `pitch` in the workbench resets the trackball orientation. During a drag the browser renders a smaller frame on a worker, then produces a full-resolution frame on release. The optional `stats` attribute (or `element.stats = true` property) displays completed draw FPS (zero while idle), render and presentation times, input-to-image latency, canvas dimensions, pixel count, geometry counts, quality, and backend. The `noble-render` event exposes the same metrics in `event.detail`.

Set `rotate` and `float` from `0` (off) to `1` for subtle pickup motion. At `rotate="1"`, the model turns around its vertical axis at 0.35 radians per second (one revolution in about 18 seconds). At `float="1"`, the image bobs by up to 8 pixels in each direction over a 3.6-second cycle; smaller components use a proportionally smaller distance. Both values default to `0` and can also be set through `element.rotate` and `element.float`. Dragging pauses the automatic turn and resumes it from the dragged orientation. Motion pauses when the user prefers reduced motion.

## Render in Node

```ts
import { savePng } from "@noble-polyhedra/node";

await savePng("avatar.png", {
  shape: "great-stellated-dodecahedron",
  palette: "violet",
  view: "wireframe",
  background: "transparent",
  width: 512,
  height: 512,
});
```

The command-line renderer is also available after building:

```sh
node packages/node/dist/cli.js --shape stephanoid --palette coral --out crown.png
```

The Node package writes PNG with Node's built-in compression. The browser and Node both use the same pure TypeScript depth-buffered renderer, so the pixels and alpha channel match for identical settings. No browser or native canvas dependency is required for image generation. The workbench uses local shadcn/ui components with neutral light and dark themes based on `jakiestfu-next/packages/ui`.

## Mathematical scope

The core implements all 146 classified finite forms and exports `KNOWN_FINITE_COUNT` and `IMPLEMENTED_FINITE_COUNT` (both 146). It also supports the disphenoid and stephanoid families (including prismatic and antiprismatic crowns). The core keeps ordered mathematical face cycles separate from rendering. Valid crown parameters follow Hill's definitions; tuples that generate disconnected compounds are rejected.

Self-crossing face interiors use an even-odd fill rule for display. That rule is a visual convention; the ordered vertices and abstract edges remain the source of mathematical topology. See [Geometry and catalogue notes](docs/geometry.md).

The implementation is original and MIT licensed. It uses the mathematical descriptions in [Connor Hill's paper](https://arxiv.org/abs/2607.28711) and does not include code or model files from the GPL-3.0 [`noble-tools-revised` repository](https://github.com/Plasmath/noble-tools-revised).
