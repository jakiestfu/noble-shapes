import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "release");
mkdirSync(destination, { recursive: true });
const result = spawnSync("pnpm", ["--dir", join(root, "packages/noble-shapes"), "pack", "--pack-destination", destination], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
