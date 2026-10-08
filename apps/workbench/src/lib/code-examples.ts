import { PRODUCT } from "@/lib/resources";
import type { CodeExample } from "@/components/code-preview";

export const CODE_EXAMPLES = {
  "web-component": {
    formats: [
      { id: "html", label: "HTML", language: "html", code: `<script type="module">
  import "${PRODUCT.packages.webComponent}";
</script>

<noble-shape
  shape="great-stellated-dodecahedron"
  view="solid-wireframe"
  palette="coral"
  style="width: 360px; height: 360px"
></noble-shape>` },
      { id: "javascript", label: "JavaScript", language: "js", code: `import "${PRODUCT.packages.webComponent}";

const shape = document.createElement("noble-shape");
shape.setAttribute("shape", "great-stellated-dodecahedron");
shape.setAttribute("view", "solid-wireframe");
shape.setAttribute("palette", "coral");
shape.style.cssText = "width: 360px; height: 360px";
document.body.append(shape);` },
      { id: "typescript", label: "TypeScript", language: "ts", code: `import "${PRODUCT.packages.webComponent}";

const shape = document.createElement("noble-shape");
shape.setAttribute("shape", "great-stellated-dodecahedron");
shape.setAttribute("view", "solid-wireframe");
shape.setAttribute("palette", "coral");
shape.style.cssText = "width: 360px; height: 360px";
document.body.append(shape);` },
      { id: "react", label: "React", language: "tsx", code: `import "${PRODUCT.packages.webComponent}";
import "${PRODUCT.packages.webComponent}/react";

export function NobleShapePreview() {
  return <noble-shape
    shape="great-stellated-dodecahedron"
    view="solid-wireframe"
    palette="coral"
    style={{ width: 360, height: 360 }}
  />;
}` },
      { id: "vue", label: "Vue", language: "vue", code: `<!-- Mark noble-shape as a custom element in Vue's compiler options. -->
<script setup>
import "${PRODUCT.packages.webComponent}";
</script>

<template>
  <noble-shape
    shape="great-stellated-dodecahedron"
    view="solid-wireframe"
    palette="coral"
    style="width: 360px; height: 360px"
  />
</template>` },
      { id: "node", label: "Node", language: "js", code: `import { savePng } from "${PRODUCT.packages.node}";

await savePng("shape.png", {
  shape: "great-stellated-dodecahedron",
  view: "solid-wireframe",
  palette: "coral",
  width: 512,
  height: 512,
});` },
      { id: "cli", label: "CLI", language: "sh", code: `npm exec -- ${PRODUCT.packages.main} \\
  --out shape.png \\
  --shape great-stellated-dodecahedron \\
  --view solid-wireframe \\
  --palette coral \\
  --width 512 --height 512` },
    ],
    preview: { kind: "component", attributes: { shape: "great-stellated-dodecahedron", view: "solid-wireframe", palette: "coral" }, background: "#21101b", caption: "Interactive preview · drag to rotate" },
  },
  "node-image": {
    formats: [
      { id: "node", label: "Node", language: "js", code: `import { savePng } from "${PRODUCT.packages.node}";

await savePng("avatar.png", {
  shape: "great-dodecahedron",
  view: "solid-wireframe",
  palette: "violet",
  width: 512,
  height: 512,
  background: "transparent",
});` },
      { id: "typescript", label: "TypeScript", language: "ts", code: `import { renderPng } from "${PRODUCT.packages.node}";

const png: Uint8Array = renderPng({
  shape: "great-dodecahedron",
  view: "solid-wireframe",
  palette: "violet",
  width: 512,
  height: 512,
  background: "transparent",
});` },
      { id: "cli", label: "CLI", language: "sh", code: `npm exec -- ${PRODUCT.packages.main} \\
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
