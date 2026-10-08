# @noble-shapes/web-component

A native custom element for interactive noble polyhedra. It renders with WebGL2 when available and falls back to a CPU renderer. No framework runtime is required.

```sh
npm install @noble-shapes/web-component
```

In an app with a bundler, register the element once:

```ts
import "@noble-shapes/web-component";
```

```html
<noble-shape shape="great-icosahedron" palette="violet" style="width: 320px; height: 320px"></noble-shape>
```

Use `random="username"` for a repeatable design; explicit attributes override its generated settings. `view` selects facets, wireframe, or one face. `rotate` and `float` accept values from 0 to 1, and `stats` displays renderer metrics. In TypeScript React projects, also import `@noble-shapes/web-component/react` for JSX types.

A plain HTML file needs an import map or bundled script to resolve the npm package name. See the [documentation](https://nobleshap.es/documentation) and [Create 3D](https://nobleshap.es/3d) for working examples.

MIT licensed. [Source](https://github.com/jakiestfu/noble-shapes/tree/main/packages/web-component).
