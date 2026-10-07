import { createPolyhedron, seededDefaults, SHAPES, type ShapeId } from "@noble-polyhedra/core";
import "@noble-polyhedra/web-component";
import type { NoblePolyhedronElement } from "@noble-polyhedra/web-component";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const shapeOptions = [{ id: "random", name: "Surprise me" }, ...SHAPES].map(item => `<option value="${item.id}">${item.name}</option>`).join("");
app.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#top"><span class="brand-mark">✳</span><span>NOBLE<span class="brand-light">/</span>FORMS</span></a>
      <nav><a href="#workbench">Workbench</a><a href="#explore">Explore</a><a href="#embed">Embed</a></nav>
      <span class="header-pill">An experiment in symmetry</span>
    </header>
    <main id="top">
      <section class="intro">
        <div><p class="eyebrow"><span class="eyebrow-line"></span> GEOMETRY, MADE PERSONAL</p><h1>Every angle<br /><em>has a story.</em></h1>
          <p class="intro-copy">A little universe of noble polyhedra. Explore curious forms, tune the mood, and make one yours.</p>
          <a class="intro-link" href="#workbench">Enter the workbench <span>↗</span></a>
        </div>
        <div class="intro-side"><span class="intro-side-line"></span><span>146 KNOWN FINITE FORMS<br />+ TWO INFINITE FAMILIES</span></div>
      </section>

      <section class="workbench" id="workbench">
        <div class="section-head"><div><p class="eyebrow">01 / THE WORKBENCH</p><h2>Shape the extraordinary.</h2></div><p>Drag to rotate · Scroll to zoom</p></div>
        <div class="workspace-grid">
          <div class="preview-panel">
            <div class="preview-top"><span class="live-dot"></span><span>LIVE PREVIEW</span><span id="preview-index">-- / --</span></div>
            <noble-polyhedron id="hero-poly" shape="small-stellated-dodecahedron" seed="noble-01" palette="aurora" yaw="0.6" pitch="0.72"></noble-polyhedron>
            <div class="preview-bottom"><div><span class="meta-label">CURRENT FORM</span><strong id="current-name">Small stellated dodecahedron</strong></div><div class="shape-stats" id="shape-stats"></div></div>
          </div>
          <aside class="control-panel">
            <div class="control-head"><div><span class="panel-icon">✺</span><h3>Make it yours</h3></div><p>Choose a form, then find its character.</p></div>
            <div class="control-content">
              <label class="field"><span class="field-label">Form <small>01</small></span><select id="shape">${shapeOptions}</select></label>
              <div class="field"><span class="field-label">View <small>02</small></span><div class="view-options" role="group" aria-label="View mode">
                <button data-view="solid">Shaded</button><button class="active" data-view="solid-wireframe">Shaded + edges</button>
                <button data-view="wireframe">Wireframe</button><button data-view="face">One face</button>
                <button data-view="face-context">Face + wireframe</button>
              </div></div>
              <div id="face-field" class="range-field" hidden><label for="face-index">Repeated face <span id="face-value">1 of 12</span></label><input id="face-index" type="range" min="0" max="11" step="1" value="0" /></div>
              <div class="field"><span class="field-label">Seed <small>03</small></span><div class="seed-row"><input id="seed" type="text" value="noble-01" spellcheck="false" /><button id="shuffle" title="New seed" aria-label="New seed">↻</button></div></div>
              <div id="family-fields" class="family-fields" hidden></div>
              <div class="field"><span class="field-label">Palette <small>04</small></span><div class="palette-row" role="group" aria-label="Palette">
                <button class="swatch active" data-palette="aurora" title="Aurora" aria-label="Aurora palette"><i style="background:#5ce0d3"></i></button>
                <button class="swatch" data-palette="coral" title="Coral" aria-label="Coral palette"><i style="background:#ffad8c"></i></button>
                <button class="swatch" data-palette="violet" title="Violet" aria-label="Violet palette"><i style="background:#c0adff"></i></button>
                <button class="swatch" data-palette="gold" title="Gold" aria-label="Gold palette"><i style="background:#ffce83"></i></button>
              </div></div>
              <div class="color-row"><label class="mini-field">Facet color <input id="color" type="color" value="#5ce0d3" /></label><label class="mini-field">Background <input id="background" type="color" value="#07131d" /></label></div>
              <div class="range-field"><label for="yaw">Rotation <span id="yaw-value">0.60</span></label><input id="yaw" type="range" min="-3.14" max="3.14" step="0.01" value="0.6" /></div>
              <div class="range-field"><label for="pitch">Tilt <span id="pitch-value">0.72</span></label><input id="pitch" type="range" min="-1.45" max="1.45" step="0.01" value="0.72" /></div>
              <div class="range-field"><label for="zoom">Scale <span id="zoom-value">1.00</span></label><input id="zoom" type="range" min="0.5" max="1.5" step="0.01" value="1" /></div>
            </div>
            <button id="download" class="download-button">Download PNG <span>↓</span></button>
          </aside>
        </div>
      </section>

      <section id="explore" class="explore-section"><div class="section-head"><div><p class="eyebrow">02 / A FEW FAVORITES</p><h2>Curiosity has many faces.</h2></div><p>Pick a form to explore</p></div>
        <div class="form-grid" id="form-grid"></div>
      </section>

      <section id="embed" class="embed-section"><div class="embed-copy"><p class="eyebrow">03 / TAKE IT WITH YOU</p><h2>A universe in<br /><em>one little tag.</em></h2><p>Drop this web component into any page. The same settings also render in Node for avatars, cards, and generated imagery.</p></div>
        <div class="code-panel"><div class="code-head"><span><i></i> WEB COMPONENT</span><button id="copy">Copy code ↗</button></div><pre><code id="code"></code></pre><div class="code-foot">Works anywhere modern web components do.</div></div>
      </section>
      <footer><span class="brand"><span class="brand-mark">✳</span><span>NOBLE<span class="brand-light">/</span>FORMS</span></span><span>Inspired by the mathematics of noble polyhedra.</span><a href="https://arxiv.org/abs/2607.28711" target="_blank" rel="noreferrer">Read the research ↗</a></footer>
    </main>
  </div>`;

const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const hero = $("#hero-poly") as NoblePolyhedronElement;
const shape = $("#shape") as HTMLSelectElement;
const seed = $("#seed") as HTMLInputElement;
const color = $("#color") as HTMLInputElement;
const background = $("#background") as HTMLInputElement;
const yaw = $("#yaw") as HTMLInputElement;
const pitch = $("#pitch") as HTMLInputElement;
const zoom = $("#zoom") as HTMLInputElement;
const faceIndex = $("#face-index") as HTMLInputElement;
const faceField = $("#face-field");
const familyFields = $("#family-fields");
const code = $("#code");
let palette = "aurora";
let customColors = false;
let view = "solid-wireframe";
let previousPitch = pitch.value;
const paletteColors: Record<string, { color: string; background: string }> = {
  aurora: { color: "#5ce0d3", background: "#07131d" },
  coral: { color: "#ffad8c", background: "#21101b" },
  violet: { color: "#c0adff", background: "#131025" },
  gold: { color: "#ffce83", background: "#20150d" },
};

function familyInputs(): void {
  const current = shape.value;
  familyFields.hidden = !["disphenoid", "stephanoid", "antistephanoid"].includes(current);
  if (current === "disphenoid") familyFields.innerHTML = `<div class="family-label">FAMILY PARAMETERS</div><div class="triple-input"><label>Axis A<input id="a" type="number" min="0.1" step="0.05" value="1.15" /></label><label>Axis B<input id="b" type="number" min="0.1" step="0.05" value="0.9" /></label><label>Axis C<input id="c" type="number" min="0.1" step="0.05" value="0.75" /></label></div>`;
  else if (current === "stephanoid" || current === "antistephanoid") familyFields.innerHTML = `<div class="family-label">FAMILY PARAMETERS</div><div class="triple-input"><label>Rings<input id="n" type="number" min="${current === "stephanoid" ? "5" : "4"}" step="1" value="5" /></label><label>Step P<input id="p" type="number" min="1" step="1" value="${current === "stephanoid" ? "3" : "2"}" /></label><label>Step Q<input id="q" type="number" min="1" step="1" value="1" /></label></div><label class="height-input">Height<input id="crown-height" type="range" min="0.2" max="1.5" step="0.05" value="0.7" /></label>`;
  else familyFields.innerHTML = "";
}

const familyNumber = (id: string): number | undefined => {
  const field = document.getElementById(id) as HTMLInputElement | null;
  return field ? Number(field.value) : undefined;
};

function update(): void {
  const current = shape.value === "random" ? seededDefaults(seed.value).shape : shape.value as ShapeId;
  let poly: ReturnType<typeof createPolyhedron> | undefined;
  try {
    poly = createPolyhedron({ shape: current, n: familyNumber("n"), p: familyNumber("p"), q: familyNumber("q"), a: familyNumber("a"), b: familyNumber("b"), c: familyNumber("c"), crownHeight: familyNumber("crown-height") });
    faceIndex.max = String(poly.faces.length - 1);
    if (Number(faceIndex.value) >= poly.faces.length) faceIndex.value = "0";
    $("#face-value").textContent = `${Number(faceIndex.value) + 1} of ${poly.faces.length}`;
  } catch { /* The component will show the parameter error. */ }
  const attributes: Record<string, string | undefined> = {
    shape: shape.value, seed: seed.value, palette,
    color: customColors ? color.value : undefined,
    background: customColors ? background.value : undefined,
    yaw: yaw.value, pitch: pitch.value, zoom: zoom.value,
    view,
    "face-index": view === "face" || view === "face-context" ? faceIndex.value : undefined,
    n: familyNumber("n")?.toString(), p: familyNumber("p")?.toString(), q: familyNumber("q")?.toString(),
    a: familyNumber("a")?.toString(), b: familyNumber("b")?.toString(), c: familyNumber("c")?.toString(),
    "crown-height": familyNumber("crown-height")?.toString(),
  };
  for (const [key, value] of Object.entries(attributes)) value === undefined ? hero.removeAttribute(key) : hero.setAttribute(key, value);
  $("#yaw-value").textContent = Number(yaw.value).toFixed(2);
  $("#pitch-value").textContent = Number(pitch.value).toFixed(2);
  $("#zoom-value").textContent = Number(zoom.value).toFixed(2);
  const index = SHAPES.findIndex(item => item.id === current);
  $("#preview-index").textContent = `${String(index + 1).padStart(2, "0")} / ${String(SHAPES.length).padStart(2, "0")}`;
  const descriptor = SHAPES[index];
  $("#current-name").textContent = descriptor?.name ?? current;
  $("#shape-stats").textContent = poly ? `${poly.vertices.length} vertices · ${poly.edges.length} edges · ${poly.faces.length} faces` : "Adjust family parameters";
  const extra = Object.entries(attributes).filter(([key, value]) => value !== undefined && !["yaw", "pitch", "zoom"].includes(key)).map(([key, value]) => `  ${key}="${String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`).join("\n");
  code.textContent = `import "@noble-polyhedra/web-component";\n\n<noble-polyhedron\n${extra}\n  yaw="${yaw.value}"\n  pitch="${pitch.value}"\n  zoom="${zoom.value}"\n></noble-polyhedron>`;
}

shape.value = "small-stellated-dodecahedron";
shape.addEventListener("change", () => { familyInputs(); update(); });
document.querySelectorAll<HTMLButtonElement>(".view-options button").forEach(button => button.addEventListener("click", () => {
  const nextView = button.dataset.view!;
  if (nextView === "face" && view !== "face") { previousPitch = pitch.value; pitch.value = "0"; }
  else if (view === "face" && nextView !== "face") pitch.value = previousPitch;
  view = nextView;
  faceField.hidden = !(view === "face" || view === "face-context");
  document.querySelectorAll(".view-options button").forEach(item => item.classList.toggle("active", item === button));
  update();
}));
faceIndex.addEventListener("input", update);
const applySeed = () => { const defaults = seededDefaults(seed.value); yaw.value = String(defaults.yaw); pitch.value = String(defaults.pitch); update(); };
seed.addEventListener("input", applySeed);
$("#shuffle").addEventListener("click", () => { seed.value = Math.random().toString(36).slice(2, 10); applySeed(); });
for (const slider of [yaw, pitch, zoom]) slider.addEventListener("input", update);
familyFields.addEventListener("input", update);
for (const input of [color, background]) input.addEventListener("input", () => { customColors = true; update(); });
document.querySelectorAll<HTMLButtonElement>(".swatch").forEach(button => button.addEventListener("click", () => {
  palette = button.dataset.palette!; customColors = false;
  color.value = paletteColors[palette]!.color; background.value = paletteColors[palette]!.background;
  document.querySelectorAll(".swatch").forEach(item => item.classList.toggle("active", item === button));
  update();
}));
hero.addEventListener("change", () => {
  for (const [field, attribute] of [[yaw, "yaw"], [pitch, "pitch"], [zoom, "zoom"]] as const) field.value = hero.getAttribute(attribute) ?? field.value;
  update();
});
$("#download").addEventListener("click", () => hero.canvas.toBlob(blob => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `noble-${shape.value}.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}, "image/png"));
$("#copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(code.textContent ?? "");
  $("#copy").textContent = "Copied ✓";
  setTimeout(() => { $("#copy").textContent = "Copy code ↗"; }, 1400);
});

const favorites: ShapeId[] = ["small-stellated-dodecahedron", "great-stellated-dodecahedron", "great-dodecahedron", "great-icosahedron"];
$("#form-grid").innerHTML = favorites.map((id, index) => `<button class="form-card" data-shape="${id}"><span class="form-card-top">0${index + 1} / FORM</span><noble-polyhedron shape="${id}" seed="favorite-${index}" palette="${["gold", "aurora", "coral", "violet"][index]}" yaw="0.6" pitch="0.72"></noble-polyhedron><span class="form-card-bottom"><strong>${SHAPES.find(item => item.id === id)!.name}</strong><span>↗</span></span></button>`).join("");
document.querySelectorAll<HTMLButtonElement>(".form-card").forEach(button => button.addEventListener("click", () => {
  shape.value = button.dataset.shape!; familyInputs(); update(); document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth" });
}));
familyInputs(); update();
