import type { CodeExample } from "@/components/code-preview";

export const CODE_EXAMPLES = {
  "web-component": {
    formats: [
      { id: "html", label: "HTML", language: "html", code: `<script type="module">
  import "@noble-polyhedra/web-component";
</script>

<noble-polyhedron
  shape="great-stellated-dodecahedron"
  view="solid-wireframe"
  palette="coral"
  style="width: 360px; height: 360px"
></noble-polyhedron>` },
      { id: "javascript", label: "JavaScript", language: "js", code: `import "@noble-polyhedra/web-component";

const form = document.createElement("noble-polyhedron");
form.setAttribute("shape", "great-stellated-dodecahedron");
form.setAttribute("view", "solid-wireframe");
form.setAttribute("palette", "coral");
form.style.cssText = "width: 360px; height: 360px";
document.body.append(form);` },
      { id: "typescript", label: "TypeScript", language: "ts", code: `import "@noble-polyhedra/web-component";

const form = document.createElement("noble-polyhedron");
form.setAttribute("shape", "great-stellated-dodecahedron");
form.setAttribute("view", "solid-wireframe");
form.setAttribute("palette", "coral");
form.style.cssText = "width: 360px; height: 360px";
document.body.append(form);` },
      { id: "react", label: "React", language: "tsx", code: `import { createElement } from "react";
import "@noble-polyhedra/web-component";

export function NobleForm() {
  return createElement("noble-polyhedron", {
    shape: "great-stellated-dodecahedron",
    view: "solid-wireframe",
    palette: "coral",
    style: { width: 360, height: 360 },
  });
}` },
      { id: "vue", label: "Vue", language: "vue", code: `<!-- Mark noble-polyhedron as a custom element in Vue's compiler options. -->
<script setup>
import "@noble-polyhedra/web-component";
</script>

<template>
  <noble-polyhedron
    shape="great-stellated-dodecahedron"
    view="solid-wireframe"
    palette="coral"
    style="width: 360px; height: 360px"
  />
</template>` },
      { id: "node", label: "Node", language: "js", code: `import { savePng } from "@noble-polyhedra/node";

await savePng("form.png", {
  shape: "great-stellated-dodecahedron",
  view: "solid-wireframe",
  palette: "coral",
  width: 512,
  height: 512,
});` },
      { id: "cli", label: "CLI", language: "sh", code: `npm exec -- noble-render \\
  --out form.png \\
  --shape great-stellated-dodecahedron \\
  --view solid-wireframe \\
  --palette coral \\
  --width 512 --height 512` },
    ],
    preview: { kind: "component", attributes: { shape: "great-stellated-dodecahedron", view: "solid-wireframe", palette: "coral" }, background: "#21101b", caption: "Interactive preview · drag to rotate" },
  },
  "node-image": {
    formats: [
      { id: "node", label: "Node", language: "js", code: `import { savePng } from "@noble-polyhedra/node";

await savePng("avatar.png", {
  shape: "great-dodecahedron",
  view: "solid-wireframe",
  palette: "violet",
  width: 512,
  height: 512,
  background: "transparent",
});` },
      { id: "typescript", label: "TypeScript", language: "ts", code: `import { renderPng } from "@noble-polyhedra/node";

const png: Uint8Array = renderPng({
  shape: "great-dodecahedron",
  view: "solid-wireframe",
  palette: "violet",
  width: 512,
  height: 512,
  background: "transparent",
});` },
      { id: "cli", label: "CLI", language: "sh", code: `npm exec -- noble-render \\
  --out avatar.png \\
  --shape great-dodecahedron \\
  --view solid-wireframe \\
  --palette violet \\
  --background transparent \\
  --width 512 --height 512` },
    ],
    preview: { kind: "raster", options: { shape: "great-dodecahedron", view: "solid-wireframe", palette: "violet", background: "transparent" }, caption: "Shared renderer output · transparent PNG" },
  },
} satisfies Record<string, CodeExample>;

export type CodeExampleId = keyof typeof CODE_EXAMPLES;
