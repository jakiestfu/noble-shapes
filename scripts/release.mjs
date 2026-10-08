import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

const checkOnly = process.argv.slice(2).join(" ") === "--check";
if (process.argv.length > 2 && !checkOnly) {
  throw new Error("Usage: pnpm release [--check]");
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const publishedPackage = JSON.parse(readFileSync(join(root, "packages/noble-shapes/package.json"), "utf8"));
const version = semver.valid(workspace.version);
if (!version || version !== workspace.version) {
  throw new Error("Set a valid semver version in the root package.json before releasing");
}
const tag = semver.prerelease(version) ? "next" : "latest";
const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(publishedPackage.name)}`;

async function readRegistry() {
  const response = await fetch(registryUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return { versions: [], tags: {} };
  if (response.status !== 200) {
    throw new Error(`Could not check npm for ${publishedPackage.name}: HTTP ${response.status}`);
  }
  const metadata = await response.json();
  return { versions: Object.keys(metadata.versions ?? {}), tags: metadata["dist-tags"] ?? {} };
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function verifyTag() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const metadata = await readRegistry();
    if (metadata.tags[tag] === version) return true;
    const newest = semver.rsort(metadata.versions.filter(candidate => semver.valid(candidate)))[0];
    if (newest && semver.gt(newest, version)) {
      throw new Error(`npm now has ${newest}; refusing to move ${tag} back to ${version}`);
    }
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 1_500));
  }
  return false;
}

async function ensureTag() {
  if (await verifyTag()) return;
  run("npm", ["dist-tag", "add", `${publishedPackage.name}@${version}`, tag]);
  if (!(await verifyTag())) throw new Error(`npm did not move ${tag} to ${version}`);
}

const metadata = await readRegistry();
const newest = semver.rsort(metadata.versions.filter(candidate => semver.valid(candidate)))[0];
if (metadata.versions.includes(version)) {
  if (newest === version && metadata.tags[tag] !== version) {
    if (checkOnly) {
      console.log(`${publishedPackage.name}@${version} is published, but ${tag} points to ${metadata.tags[tag] ?? "nothing"}.`);
    } else {
      await ensureTag();
      console.log(`Updated ${tag} to ${publishedPackage.name}@${version}.`);
    }
  } else {
    console.log(newest === version
      ? `${publishedPackage.name}@${version} is already the current ${tag} release; nothing to release.`
      : `${publishedPackage.name}@${version} is already on npm and ${newest} is newer; nothing to release.`);
  }
  process.exit(0);
}
if (newest && !semver.gt(version, newest)) {
  throw new Error(`Root version ${version} must be greater than the newest published version, ${newest}`);
}
if (checkOnly) {
  console.log(`${publishedPackage.name}@${version} is newer than the npm release${newest ? ` (${newest})` : ""} and is ready to publish with ${tag}.`);
  process.exit(0);
}

run("pnpm", ["release:check"]);
run("pnpm", ["release:pack"]);
const archive = join(root, "release", `${publishedPackage.name}-${version}.tgz`);
if (!existsSync(archive)) throw new Error(`Release archive was not created: ${archive}`);
run("npm", ["publish", archive, "--access", "public", "--tag", tag]);
await ensureTag();
console.log(`${publishedPackage.name}@${version} is the current ${tag} release.`);
