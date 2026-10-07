import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PAGE_CARDS, renderOgCard } from "../src/server/og-card.ts";

const output = join(dirname(fileURLToPath(import.meta.url)), "../public/og");
await mkdir(output, { recursive: true });
for (const [page, card] of Object.entries(PAGE_CARDS)) {
  await writeFile(join(output, `${page}.png`), await renderOgCard(card.design, card.title, card.subtitle));
}
