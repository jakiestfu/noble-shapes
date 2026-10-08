## Catalogue

The package exposes **146 finite forms** and entries for the two infinite families through `SHAPES`. Use an entry's `id` as the `shape` value in the component, Node renderer, CLI, or JavaScript API. The workbench's form picker searches both names and IDs.

### Named finite forms

The familiar named entries are `tetrahedron`, `cube`, `octahedron`, `dodecahedron`, `icosahedron`, `small-stellated-dodecahedron`, `great-dodecahedron`, `great-stellated-dodecahedron`, and `great-icosahedron`.

```html
<noble-shape shape="great-stellated-dodecahedron" view="solid-wireframe"></noble-shape>
```

### Catalogue IDs

The remaining finite entries retain their research IDs, such as `ID-1`, `D-2`, `tC-1.1`, and `tI-1.1`. Search for an ID in the form picker to see its full name. The `SHAPES` list is the canonical machine-readable index, so code can present the complete catalogue without maintaining a second copy of all 146 names.

```ts
import { SHAPES } from "@noble-shapes/core";

const finiteForms = SHAPES.filter(({ family }) => family === "Finite");
console.log(finiteForms.length); // 146
```

### Infinite families

`disphenoid` takes positive axis lengths `a`, `b`, and `c`. The stephanoid family uses `n`, `p`, `q`, and `crownHeight`; select `stephanoid` for its prismatic form or `antistephanoid` for its antiprismatic form.

```ts
import { createPolyhedron } from "@noble-shapes/core";

const polyhedron = createPolyhedron({ shape: "antistephanoid", n: 7, p: 3, q: 1, crownHeight: 0.7 });
```

### Faces and topology

`createPolyhedron()` returns vertices, edges, and ordered face cycles. Face indices are zero based. Use `view="face"` with `face-index="0"` to inspect one face, or `view="face-context"` to locate it against the complete wireframe. Crossings in a star face are visual intersections; they are not extra vertices in the abstract topology.

## Further reading

Read the [Research page](/research) for Connor Hill's classification, the video, Wikipedia introductions, and Stella tools. The repository's `docs/geometry.md` covers the construction in more detail. This implementation is independent and MIT licensed.
