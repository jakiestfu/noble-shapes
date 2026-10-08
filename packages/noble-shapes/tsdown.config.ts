import { defineConfig } from "tsdown";

const internalPackages = /^@noble-shapes\//;

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core.ts",
    render: "src/render.ts",
    node: "src/node.ts",
    "web-component": "src/web-component.ts",
    react: "src/react.ts",
    cli: "src/cli.ts",
    "renderer.worker": "../web-component/src/renderer.worker.ts",
  },
  format: "esm",
  fixedExtension: false,
  dts: true,
  clean: true,
  deps: {
    alwaysBundle: [internalPackages],
    dts: { alwaysBundle: [internalPackages], neverBundle: ["react"] },
  },
});
