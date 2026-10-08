import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = mkdtempSync(join(tmpdir(), "noble-shapes-pack-"));

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
  return result.stdout;
}

try {
  const source = join(root, "packages/noble-shapes");
  const destination = join(temporary, "archive");
  mkdirSync(destination);
  run("pnpm", ["--dir", source, "pack", "--pack-destination", destination]);
  const archives = readdirSync(destination).filter(file => file.endsWith(".tgz"));
  if (archives.length !== 1) throw new Error(`Expected one tarball, found ${archives.length}`);
  const archive = join(destination, archives[0]);
  const files = new Set(run("tar", ["-tzf", archive]).trim().split("\n"));
  const packed = JSON.parse(run("tar", ["-xOf", archive, "package/package.json"]));
  const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (packed.name !== "noble-shapes" || packed.version !== rootManifest.version || packed.private) {
    throw new Error("The public package must use the root version");
  }
  if (Object.keys(packed.dependencies ?? {}).length || Object.keys(packed.optionalDependencies ?? {}).length) {
    throw new Error("The public package must have no runtime package dependencies");
  }
  for (const file of ["README.md", "LICENSE", "dist/index.js", "dist/index.d.ts", "dist/renderer.worker.js"]) {
    if (!files.has(`package/${file}`)) throw new Error(`Missing ${file} from tarball`);
  }
  for (const [entry, paths] of Object.entries(packed.exports ?? {})) {
    for (const target of Object.values(typeof paths === "string" ? { import: paths } : paths)) {
      if (!files.has(`package/${target.replace(/^\.\//, "")}`)) {
        throw new Error(`Export ${entry} points to missing ${target}`);
      }
    }
  }
  for (const target of Object.values(packed.bin ?? {})) {
    if (!files.has(`package/${target.replace(/^\.\//, "")}`)) throw new Error(`Binary points to missing ${target}`);
  }
  for (const file of files) {
    if (!/^package\/dist\/.*\.(?:js|ts)$/.test(file)) continue;
    const contents = run("tar", ["-xOf", archive, file]);
    if (/(?:from\s*|import\s*\(|require\s*\()\s*["']@noble-shapes\//.test(contents)) {
      throw new Error(`${file} imports an unpublished package`);
    }
  }

  const consumer = join(temporary, "consumer");
  mkdirSync(consumer);
  writeFileSync(join(consumer, "package.json"), '{"private":true,"type":"module"}\n');
  run("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(temporary, "npm-cache"), archive], consumer);
  run("node", ["--input-type=module", "-e", `
    import { createPolyhedron as createFromRoot } from "noble-shapes";
    import { createPolyhedron } from "noble-shapes/core";
    import { renderScene } from "noble-shapes/render";
    import { renderPng } from "noble-shapes/node";
    import "noble-shapes/web-component";
    import "noble-shapes/react";
    const cube = createPolyhedron({ shape: "cube" });
    if (!cube.vertices.length || typeof createFromRoot !== "function" || typeof renderScene !== "function" || typeof renderPng !== "function")
      throw new Error("Broken public exports");
  `], consumer);
  run("node", [join(consumer, "node_modules/noble-shapes/dist/cli.js"), "--help"], consumer);
  writeFileSync(join(consumer, "consumer.ts"), `
    import { createPolyhedron as createFromRoot } from "noble-shapes";
    import { createPolyhedron, type ShapeId } from "noble-shapes/core";
    import { renderScene } from "noble-shapes/render";
    import { renderPng } from "noble-shapes/node";
    import type { NobleShapeElement } from "noble-shapes/web-component";
    const id: ShapeId = "cube";
    const shape = createPolyhedron({ shape: id });
    const image = renderScene({ shape: id });
    const png = renderPng({ shape: id });
    let element: NobleShapeElement;
    void [createFromRoot, shape, image, png, element];
  `);
  run(join(root, "node_modules/.bin/tsc"), ["--noEmit", "--skipLibCheck", "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "consumer.ts"], consumer);
  console.log(`Verified clean installation of ${packed.name}@${packed.version}`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
