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

For a browser component, import `noble-shapes/web-component` and render `<noble-shape shape="cube"></noble-shape>`. For a PNG file in Node, import `savePng` from `noble-shapes/node`. The `noble-shapes` command renders images from a terminal; `noble-render` is an alias.

Geometry, rendering, the web component, and Node tools are also available as smaller `@noble-shapes/*` packages. See the [documentation](https://nobleshap.es/documentation) and [Create](https://nobleshap.es/create).
