import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import rehypeSlug from "rehype-slug";
import { defineConfig } from "vite";

const documentationPath = fileURLToPath(new URL("../../DOCUMENTATION.md", import.meta.url));
const cataloguePath = fileURLToPath(new URL("../../CATALOGUE.md", import.meta.url));
const productPath = fileURLToPath(new URL("../../product.config.json", import.meta.url));
const product = JSON.parse(readFileSync(productPath, "utf8")) as { name: string; url: string };

export default defineConfig({
  plugins: [
    {
      name: "product-identity",
      transformIndexHtml(html) {
        return html.replaceAll("__PRODUCT_NAME__", product.name).replaceAll("__SITE_URL__", product.url);
      },
    },
    {
      name: "documentation-source",
      resolveId(id) { if (id === "virtual:documentation-source") return "\0virtual:documentation-source"; },
      load(id) {
        if (id !== "\0virtual:documentation-source") return;
        this.addWatchFile(documentationPath);
        this.addWatchFile(cataloguePath);
        return `export default ${JSON.stringify(`${readFileSync(documentationPath, "utf8")}\n${readFileSync(cataloguePath, "utf8")}`)}`;
      },
    },
    { enforce: "pre", ...mdx({ include: /(?:DOCUMENTATION|CATALOGUE)\.md$/, format: "mdx", mdxExtensions: [".md", ".mdx"], rehypePlugins: [rehypeSlug] }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }), tailwindcss(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }, dedupe: ["react", "react-dom"] },
  build: { rollupOptions: { input: {
    workbench: fileURLToPath(new URL("./index.html", import.meta.url)),
  } } },
});
