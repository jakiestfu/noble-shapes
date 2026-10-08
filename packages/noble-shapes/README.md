# Noble Shapes

Generate and render noble polyhedra in TypeScript. Includes 146 finite shapes and two parameterized families, browser and Node image rendering, and a native web component.

This package is prepared for npm but has not been published yet. Until its first release, [run the source workspace](https://github.com/jakiestfu/noble-shapes#try-it-now). After publication, install it with:

```sh
npm install noble-shapes
```

```ts
import { createPolyhedron, renderScene } from "noble-shapes";

const shape = createPolyhedron({ shape: "great-dodecahedron" });
const image = renderScene({ shape: shape.id, width: 512, height: 512 });
```

For a browser component, install `@noble-shapes/web-component`, import it once, and render `<noble-shape shape="cube"></noble-shape>`. For a PNG file in Node, install `@noble-shapes/node` and import `savePng` from it. The `noble-shapes` command renders images from a terminal; `noble-render` is an alias.

Geometry, rendering, the web component, and Node tools are separate `@noble-shapes/*` packages; install a focused package explicitly when importing it. The umbrella package also has subpath exports for one-package installations. See the [documentation](https://nobleshap.es/documentation) and [Create 3D](https://nobleshap.es/3d).
