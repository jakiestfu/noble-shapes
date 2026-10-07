import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../.generated/", import.meta.url));
const names = ["DOCUMENTATION", "CATALOGUE"];
await mkdir(output, { recursive: true });
const sources = await Promise.all(names.map(async name => {
  const content = await readFile(new URL(`../../../${name}.md`, import.meta.url), "utf8");
  const target = `${output}${name}.mdx`;
  if (await readFile(target, "utf8").catch(() => "") !== content) await writeFile(target, content);
  return content;
}));
const sourceModule = `export default ${JSON.stringify(sources.join("\n"))};\n`;
const sourcePath = `${output}source.ts`;
if (await readFile(sourcePath, "utf8").catch(() => "") !== sourceModule) await writeFile(sourcePath, sourceModule);
