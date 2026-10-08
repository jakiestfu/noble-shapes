# @noble-shapes/render

Browser-safe raster rendering, palettes, and shareable design codes for [Noble Shapes](https://nobleshap.es). It uses `@noble-shapes/core` for geometry and does not need a browser canvas or native image dependency.

```sh
npm install @noble-shapes/render
```

```ts
import { renderScene, randomOptions, optionsToString } from "@noble-shapes/render";

const image = renderScene({ shape: "cube", palette: "gold", width: 256, height: 256 });
console.log(image.width, image.height, image.data); // RGBA pixels

const code = optionsToString(randomOptions("username"));
```

For PNG files in Node.js, use [`@noble-shapes/node`](https://github.com/jakiestfu/noble-shapes/tree/main/packages/node). For an interactive browser element, use [`@noble-shapes/web-component`](https://github.com/jakiestfu/noble-shapes/tree/main/packages/web-component).

MIT licensed. [Documentation](https://nobleshap.es/documentation).
