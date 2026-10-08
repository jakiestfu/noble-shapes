# @noble-shapes/node

PNG rendering for [Noble Shapes](https://nobleshap.es) in Node.js. It uses Node's built-in file system and compression APIs; no browser or native canvas package is required.

```sh
npm install @noble-shapes/node
```

```ts
import { savePng, renderPng } from "@noble-shapes/node";

await savePng("shape.png", { shape: "great-dodecahedron", palette: "violet", width: 512, height: 512 });
const bytes = renderPng({ shape: "cube", width: 256, height: 256 });
```

The package also provides the `noble-render` command. Run `noble-render --help` after installation for its options. The all-in-one `noble-shapes` package provides the `noble-shapes` command.

MIT licensed. [Documentation](https://nobleshap.es/documentation).
