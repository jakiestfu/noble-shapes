import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(rootManifest.version ?? "")) {
  throw new Error("Set a valid release version in the root package.json");
}

for (const directory of ["noble-shapes", "core", "render", "node", "web-component"]) {
  const path = join(root, "packages", directory, "package.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest.version !== rootManifest.version) {
    manifest.version = rootManifest.version;
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Synced ${manifest.name} to ${rootManifest.version}`);
  }
}
