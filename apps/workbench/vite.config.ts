import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import rehypeSlug from "rehype-slug";
import { defineConfig } from "vite";

const documentationPath = fileURLToPath(new URL("../../DOCUMENTATION.md", import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: "documentation-source",
      resolveId(id) { if (id === "virtual:documentation-source") return "\0virtual:documentation-source"; },
      load(id) {
        if (id !== "\0virtual:documentation-source") return;
        this.addWatchFile(documentationPath);
        return `export default ${JSON.stringify(readFileSync(documentationPath, "utf8"))}`;
      },
    },
    { enforce: "pre", ...mdx({ include: /DOCUMENTATION\.md$/, format: "mdx", mdxExtensions: [".md", ".mdx"], rehypePlugins: [rehypeSlug] }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }), tailwindcss(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }, dedupe: ["react", "react-dom"] },
});
