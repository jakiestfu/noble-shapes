import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packages = ["core", "render", "node", "web-component", "noble-shapes"];
const temporary = mkdtempSync(join(tmpdir(), "noble-shapes-pack-"));

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
  return result.stdout;
}

try {
  for (const directory of packages) {
    const source = join(root, "packages", directory);
    const destination = join(temporary, directory);
    mkdirSync(destination);
    const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
    run("pnpm", ["--dir", source, "pack", "--pack-destination", destination]);
    const archives = readdirSync(destination).filter(file => file.endsWith(".tgz"));
    if (archives.length !== 1) throw new Error(`${manifest.name}: expected one tarball, found ${archives.length}`);
    const archive = join(destination, archives[0]);
    const files = new Set(run("tar", ["-tzf", archive]).trim().split("\n"));
    const packed = JSON.parse(run("tar", ["-xOf", archive, "package/package.json"]));
    if (packed.name !== manifest.name || packed.version !== manifest.version) {
      throw new Error(`${manifest.name}: packed name or version differs from the source manifest`);
    }
    for (const file of ["README.md", "LICENSE", "dist/index.js", "dist/index.d.ts"]) {
      if (!files.has(`package/${file}`)) throw new Error(`${manifest.name}: missing ${file} from tarball`);
    }
    for (const [entry, paths] of Object.entries(packed.exports ?? {})) {
      for (const target of Object.values(typeof paths === "string" ? { import: paths } : paths)) {
        if (!files.has(`package/${target.replace(/^\.\//, "")}`)) {
          throw new Error(`${manifest.name}: export ${entry} points to missing ${target}`);
        }
      }
    }
    for (const target of Object.values(packed.bin ?? {})) {
      if (!files.has(`package/${target.replace(/^\.\//, "")}`)) {
        throw new Error(`${manifest.name}: binary points to missing ${target}`);
      }
    }
    for (const [name, version] of Object.entries(packed.dependencies ?? {})) {
      if (version.startsWith("workspace:")) throw new Error(`${manifest.name}: unpublished workspace dependency ${name}`);
    }
    console.log(`Verified ${packed.name}@${packed.version}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
