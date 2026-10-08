# Noble Shapes

Generate and render noble polyhedra in TypeScript. Includes 146 finite shapes and two parameterized families, browser and Node image rendering, and a native web component.

Install the public package with:

```sh
npm install noble-shapes
```

```ts
import { createPolyhedron, renderScene } from "noble-shapes";

const shape = createPolyhedron({ shape: "great-dodecahedron" });
const image = renderScene({ shape: shape.id, width: 512, height: 512 });
```

For a browser component, import `noble-shapes/web-component` once and render `<noble-shape shape="cube"></noble-shape>`. For a PNG file in Node, import `savePng` from `noble-shapes/node`. The `noble-shapes` command renders images from a terminal; `noble-render` is an alias.

Geometry, rendering, the web component, and Node tools are included in this one package. Import `noble-shapes/core`, `/render`, `/web-component`, `/react`, or `/node` as needed. The `@noble-shapes/*` workspace packages are private build inputs. See the [documentation](https://nobleshap.es/documentation) and [Create 3D](https://nobleshap.es/3d).
