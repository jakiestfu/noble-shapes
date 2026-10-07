import type { WorkbenchOptions } from "@noble-polyhedra/render";
import type { CodeFormat } from "@/components/code-preview";

export function workbenchCodeFormats(options: WorkbenchOptions, attributes: Record<string, string | undefined>): CodeFormat[] {
  const entries = Object.entries(attributes).filter((entry): entry is [string, string] => entry[1] !== undefined);
  const htmlAttributes = entries.map(([key, value]) => `  ${key}="${value}"`).join("\n");
  const jsxAttributes = entries.map(([key, value]) => `      ${key}=${JSON.stringify(value)}`).join("\n");
  const setAttributes = entries.map(([key, value]) => `form.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join("\n");
  const vueAttributes = entries.map(([key, value]) => `    ${key}="${value}"`).join("\n");
  const family = options.shape === "disphenoid" ? "disphenoid" : options.shape === "stephanoid" || options.shape === "antistephanoid" ? "stephanoid" : "finite";
  const scene: Record<string, string | number | readonly number[]> = {
    shape: options.shape, view: options.view, palette: options.palette,
    color: options.color, background: options.background,
    ...(options.rotation ? { rotation: options.rotation } : { yaw: options.yaw, pitch: options.pitch }),
    zoom: options.zoom,
    ...(options.view === "face" || options.view === "face-context" ? { faceIndex: options.faceIndex } : {}),
    ...(family === "stephanoid" ? { n: options.n, p: options.p, q: options.q, crownHeight: options.crownHeight } : {}),
    ...(family === "disphenoid" ? { a: options.a, b: options.b, c: options.c } : {}),
    width: 512, height: 512,
  };
  const nodeOptions = Object.entries(scene).map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`).join("\n");
  const cliKeys: Record<string, string> = { faceIndex: "face-index", crownHeight: "crown-height" };
  const cliOptions = Object.entries(scene).map(([key, value]) => `  --${cliKeys[key] ?? key} ${typeof value === "string" ? JSON.stringify(value) : Array.isArray(value) ? value.join(",") : value}`).join(" \\\n");

  return [
    { id: "html", label: "HTML", language: "html", code: `<script type="module">\n  import "@noble-polyhedra/web-component";\n</script>\n\n<noble-polyhedron\n${htmlAttributes}\n  style="width: 360px; height: 360px"\n></noble-polyhedron>` },
    { id: "javascript", label: "JavaScript", language: "js", code: `import "@noble-polyhedra/web-component";\n\nconst form = document.createElement("noble-polyhedron");\n${setAttributes}\nform.style.cssText = "width: 360px; height: 360px";\ndocument.body.append(form);` },
    { id: "typescript", label: "TypeScript", language: "ts", code: `import "@noble-polyhedra/web-component";\nimport type { NoblePolyhedronElement } from "@noble-polyhedra/web-component";\n\nconst form: NoblePolyhedronElement = document.createElement("noble-polyhedron");\n${setAttributes}\nform.style.cssText = "width: 360px; height: 360px";\ndocument.body.append(form);` },
    { id: "react", label: "React", language: "tsx", code: `import "@noble-polyhedra/web-component";\nimport "@noble-polyhedra/web-component/react";\n\nexport function NobleForm() {\n  return (\n    <noble-polyhedron\n${jsxAttributes}\n      style={{ width: 360, height: 360 }}\n    />\n  );\n}` },
    { id: "vue", label: "Vue", language: "vue", code: `<!-- Configure Vue to treat noble-polyhedron as a custom element. -->\n<script setup lang="ts">\nimport "@noble-polyhedra/web-component";\n</script>\n\n<template>\n  <noble-polyhedron\n${vueAttributes}\n    style="width: 360px; height: 360px"\n  />\n</template>` },
    { id: "node", label: "Node", language: "js", code: `import { savePng } from "@noble-polyhedra/node";\n\nawait savePng("form.png", {\n${nodeOptions}\n});` },
    { id: "cli", label: "CLI", language: "sh", code: `npm exec -- noble-render \\\n  --out form.png \\\n${cliOptions}` },
  ];
}
