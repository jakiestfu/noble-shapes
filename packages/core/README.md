# @noble-shapes/core

The mathematical catalogue and generators behind [Noble Shapes](https://nobleshap.es). This package has no runtime dependencies and exposes 146 finite noble polyhedra plus the disphenoid and stephanoid families.

```sh
npm install @noble-shapes/core
```

```ts
import { createPolyhedron, SHAPES } from "@noble-shapes/core";

const polyhedron = createPolyhedron({ shape: "great-icosahedron" });
console.log(polyhedron.vertices, polyhedron.edges, polyhedron.faces);
console.log(SHAPES.length);
```

`faces` contains ordered abstract face cycles. Visible crossings in a star face do not add vertices to those cycles. See the [catalogue](https://github.com/jakiestfu/noble-shapes/blob/main/CATALOGUE.md) and [documentation](https://nobleshap.es/documentation) for IDs and family parameters.

MIT licensed. [Source](https://github.com/jakiestfu/noble-shapes/tree/main/packages/core).
