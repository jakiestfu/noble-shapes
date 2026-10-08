import { readFileSync } from "node:fs";

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const product = read("product.config.json");
const expected = {
  "packages/noble-shapes": product.packages.main,
  "packages/core": product.packages.core,
  "packages/render": product.packages.render,
  "packages/node": product.packages.node,
  "packages/web-component": product.packages.webComponent,
};

for (const [directory, name] of Object.entries(expected)) {
  const manifest = read(`${directory}/package.json`);
  if (manifest.name !== name || manifest.homepage !== product.url) {
    throw new Error(`${directory}/package.json differs from product.config.json`);
  }
}

const umbrella = read("packages/noble-shapes/package.json");
const root = read("package.json");
if (umbrella.version !== root.version || umbrella.private) {
  throw new Error("The public package version must match the root package.json");
}
for (const dependency of Object.values(product.packages).filter(name => name !== product.packages.main)) {
  if (umbrella.devDependencies[dependency] !== "workspace:*" || umbrella.dependencies?.[dependency]) {
    throw new Error(`noble-shapes must use ${dependency} only as a workspace build dependency`);
  }
}

for (const directory of ["core", "render", "node", "web-component"]) {
  const manifest = read(`packages/${directory}/package.json`);
  if (!manifest.private || manifest.version !== root.version) {
    throw new Error(`${manifest.name} must remain private and match the root version`);
  }
}

const workbench = read("apps/workbench/package.json");
for (const dependency of [product.packages.core, product.packages.render, product.packages.node, product.packages.webComponent]) {
  if (workbench.dependencies[dependency] !== "workspace:*") {
    throw new Error(`The workbench must depend on ${dependency}`);
  }
}
