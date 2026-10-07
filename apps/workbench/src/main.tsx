import { createElement, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Check, Code2, Copy, Download, Moon, RotateCcw, Share2, Shuffle, Sun } from "lucide-react";
import { createPolyhedron, SHAPES, type ShapeId } from "@noble-polyhedra/core";
import { DEFAULT_DESIGN_OPTIONS, DEFAULT_WORKBENCH_OPTIONS, optionsToString, PALETTES, randomOptions, randomSeed, stringToOptions, type DesignOptions, type PaletteName, type Quaternion, type RenderView, type WorkbenchOptions } from "@noble-polyhedra/render";
import "@noble-polyhedra/web-component";
import type { NoblePolyhedronElement } from "@noble-polyhedra/web-component";
import { Button } from "@/components/ui/button";
import { FormPicker } from "@/components/form-picker";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { eulerCharacteristic, REGULAR_SYMBOL_LABELS, REGULAR_SYMBOLS } from "@/lib/shape-math";
import { Research } from "@/pages/research";
import "./style.css";

const Showcase = lazy(() => import("@/pages/showcase").then(module => ({ default: module.Showcase })));
const MathPanel = lazy(() => import("@/components/math-panel"));

type Page = "workbench" | "showcase" | "research";
const pageFromPath = (path: string): Page => path.replace(/\/+$/, "") === "/showcase" ? "showcase" : path.replace(/\/+$/, "") === "/research" ? "research" : "workbench";
const pathForPage = (page: Page): string => page === "workbench" ? "/" : `/${page}`;

const VIEWS: { id: RenderView; name: string }[] = [
  { id: "solid", name: "Shaded" }, { id: "solid-wireframe", name: "Shaded + edges" },
  { id: "wireframe", name: "Wireframe" }, { id: "face", name: "One face" },
  { id: "face-context", name: "Face + wireframe" },
];
const sliderValue = (value: number | readonly number[], fallback: number): number => typeof value === "number" ? value : value[0] ?? fallback;

function readLocation(): { design: DesignOptions; error: string } {
  const code = new URL(window.location.href).searchParams.get("code");
  if (!code) return { design: DEFAULT_DESIGN_OPTIONS, error: "" };
  try { return { design: stringToOptions(code), error: "" }; }
  catch (error) { return { design: DEFAULT_DESIGN_OPTIONS, error: error instanceof Error ? error.message : String(error) }; }
}
const initial = readLocation();

function Noble({ innerRef, ...attributes }: { innerRef?: React.Ref<NoblePolyhedronElement>; [key: string]: string | React.Ref<NoblePolyhedronElement> | undefined }) {
  return createElement("noble-polyhedron", { ...attributes, ref: innerRef });
}
function Control({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3 text-xs font-medium"><span>{label}</span>{value && <span className="font-mono text-muted-foreground">{value}</span>}</div>{children}</div>;
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="control-group"><h3 className="control-group-title">{title}</h3><div className="space-y-4">{children}</div></section>;
}

function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [options, setOptions] = useState<WorkbenchOptions>({ ...DEFAULT_WORKBENCH_OPTIONS, ...initial.design });
  const [stats, setStats] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);
  const [codeError, setCodeError] = useState(initial.error);
  const [parameterError, setParameterError] = useState("");
  const [identity, setIdentity] = useState("");
  const [copied, setCopied] = useState<"link" | "embed" | "">("");
  const code = useMemo(() => optionsToString(options), [options.shape, options.view, options.palette,
    options.color, options.background, options.faceIndex, options.n, options.p, options.q,
    options.crownHeight, options.a, options.b, options.c]);
  const [draftCode, setDraftCode] = useState(code);
  const hero = useRef<NoblePolyhedronElement>(null);
  const replacingDesign = useRef(false);
  const family = options.shape === "disphenoid" ? "disphenoid" : options.shape === "stephanoid" || options.shape === "antistephanoid" ? "stephanoid" : "finite";
  const poly = useMemo(() => createPolyhedron(options), [options.shape, options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c]);
  const shapeIndex = SHAPES.findIndex(item => item.id === options.shape);
  const regularSymbol = REGULAR_SYMBOLS[options.shape];

  useEffect(() => { document.documentElement.dataset.theme = options.theme; }, [options.theme]);
  useEffect(() => { document.title = `${page === "workbench" ? "Workbench" : page === "showcase" ? "Showcase" : "Research"} — Noble Forms`; }, [page]);
  useLayoutEffect(() => {
    if (replacingDesign.current && hero.current) {
      if (options.rotation) hero.current.setAttribute("rotation", options.rotation.join(","));
      else hero.current.removeAttribute("rotation");
    }
    replacingDesign.current = false;
  }, [options, page]);
  useEffect(() => {
    setDraftCode(code);
    if (page !== "workbench") return;
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.history.replaceState(null, "", url);
  }, [code, page]);
  useEffect(() => {
    const onPopState = () => {
      const nextPage = pageFromPath(window.location.pathname);
      setPage(nextPage);
      if (nextPage === "workbench") { const next = readLocation(); setOptions(previous => ({ ...previous, ...next.design })); setCodeError(next.error); }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (page !== "workbench") return;
    const element = hero.current;
    if (!element) return;
    const onChange = () => {
      if (replacingDesign.current) return;
      const value = element.getAttribute("rotation");
      const rotation = value ? value.split(",").map(Number) as unknown as Quaternion : undefined;
      const zoom = Number(element.getAttribute("zoom") ?? 1);
      setOptions(previous => ({ ...previous, rotation, zoom }));
    };
    element.addEventListener("change", onChange);
    return () => element.removeEventListener("change", onChange);
  }, [page]);

  const navigate = (nextPage: Page) => {
    if (nextPage === page) return;
    const url = new URL(pathForPage(nextPage), window.location.origin);
    if (nextPage === "workbench") url.searchParams.set("code", code);
    window.history.pushState(null, "", url);
    setPage(nextPage);
  };
  const navClick = (event: React.MouseEvent<HTMLAnchorElement>, target: Page) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(target);
  };

  const update = (patch: Partial<WorkbenchOptions>) => { setOptions(previous => ({ ...previous, ...patch })); setCodeError(""); };
  const updateGeometry = (patch: Partial<WorkbenchOptions>) => {
    try { const next = createPolyhedron({ ...options, ...patch }); update({ ...patch, faceIndex: Math.min(options.faceIndex, next.faces.length - 1) }); setParameterError(""); }
    catch (error) { setParameterError(error instanceof Error ? error.message : String(error)); }
  };
  const chooseShape = (shape: ShapeId) => {
    const patch: Partial<WorkbenchOptions> = { shape, faceIndex: 0 };
    if (shape === "stephanoid") Object.assign(patch, { n: 5, p: 3, q: 1 });
    if (shape === "antistephanoid") Object.assign(patch, { n: 5, p: 2, q: 1 });
    update(patch); setParameterError("");
  };
  const choosePalette = (palette: PaletteName) => update({ palette, color: PALETTES[palette].color,
    background: options.background === "transparent" ? "transparent" : PALETTES[palette].background });
  const applyCode = () => {
    try { setOptions(previous => ({ ...previous, ...stringToOptions(draftCode.trim()) })); setCodeError(""); setParameterError(""); }
    catch (error) { setCodeError(error instanceof Error ? error.message : String(error)); }
  };
  const generate = (seed: string) => {
    setOptions(previous => ({ ...previous, ...randomOptions(seed) }));
    setCodeError(""); setParameterError("");
  };
  const copyText = async (kind: "link" | "embed", text: string) => {
    await navigator.clipboard.writeText(text); setCopied(kind);
    window.setTimeout(() => setCopied(""), 1600);
  };

  const appearanceAttrs: Record<string, string | undefined> = {
    shape: options.shape, view: options.view, palette: options.palette, color: options.color,
    background: options.background, yaw: String(options.yaw), pitch: String(options.pitch),
    rotation: options.rotation?.join(","), zoom: String(options.zoom),
    "face-index": options.view === "face" || options.view === "face-context" ? String(options.faceIndex) : undefined,
    rotate: options.rotate > 0 ? String(options.rotate) : undefined,
    float: options.float > 0 ? String(options.float) : undefined,
    n: family === "stephanoid" ? String(options.n) : undefined,
    p: family === "stephanoid" ? String(options.p) : undefined,
    q: family === "stephanoid" ? String(options.q) : undefined,
    "crown-height": family === "stephanoid" ? String(options.crownHeight) : undefined,
    a: family === "disphenoid" ? String(options.a) : undefined,
    b: family === "disphenoid" ? String(options.b) : undefined,
    c: family === "disphenoid" ? String(options.c) : undefined,
  };
  const snippet = `import "@noble-polyhedra/web-component";\n\n<noble-polyhedron\n${Object.entries(appearanceAttrs).filter(([, value]) => value !== undefined).map(([key, value]) => `  ${key}="${value}"`).join("\n")}\n></noble-polyhedron>`;
  const shareUrl = new URL("/", window.location.origin); shareUrl.searchParams.set("code", code);
  const download = () => hero.current?.canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `noble-${options.shape}.png`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand-link" href="/" onClick={event => navClick(event, "workbench")}><div className="brand-mark">N</div><div className="min-w-0"><p className="font-heading text-sm font-bold tracking-tight">Noble Forms</p><p className="text-[10px] text-muted-foreground">Shape studio</p></div></a>
      <nav className="app-nav" aria-label="Main navigation">{(["workbench", "showcase", "research"] as const).map(item => <a key={item} href={pathForPage(item)} className={`app-nav-link ${page === item ? "is-active" : ""}`} aria-current={page === item ? "page" : undefined} onClick={event => navClick(event, item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</a>)}</nav>
      <div className="header-actions">{page === "workbench" && <Button variant="outline" size="sm" onClick={() => copyText("link", shareUrl.toString())}><Share2 className="size-3.5" /><span className="share-label">{copied === "link" ? "Copied" : "Share"}</span></Button>}<Button variant="ghost" size="icon" aria-label={`Switch to ${options.theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${options.theme === "light" ? "dark" : "light"} mode`} onClick={() => update({ theme: options.theme === "light" ? "dark" : "light" })}>{options.theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button></div>
    </header>

    {page === "showcase" ? <Suspense fallback={<main className="content-page" aria-busy="true"><div className="content-inner"><p className="eyebrow">Curated forms</p><h1 className="section-title">Showcase</h1><p className="page-description">Loading forms…</p></div></main>}><Showcase theme={options.theme} onOpen={next => { replacingDesign.current = true; setOptions(next); setCodeError(""); setParameterError(""); const url = new URL("/", window.location.origin); url.searchParams.set("code", optionsToString(next)); window.history.pushState(null, "", url); setPage("workbench"); }} /></Suspense> : page === "research" ? <Research /> : <div className="app-layout">
      <aside className="control-panel">
        <div className="control-intro"><p className="eyebrow">Workbench</p><h1 className="font-heading text-xl font-bold tracking-tight">Make a form.</h1><p className="mt-1 text-xs text-muted-foreground">Form and appearance live in the share link.</p><Button className="mt-4 w-full" onClick={() => generate(randomSeed())}><Shuffle className="size-4" /> Surprise me</Button><div className="mt-4 space-y-2"><label htmlFor="identity" className="text-xs font-medium">Generate from text</label><div className="flex gap-2"><Input id="identity" value={identity} placeholder="username" onChange={event => setIdentity(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && identity) generate(identity); }} /><Button variant="outline" size="sm" disabled={!identity} onClick={() => generate(identity)}>Generate</Button></div><p className="text-[11px] text-muted-foreground">The same text makes the same design. Camera, motion, and theme stay as you set them.</p></div></div>

        <Group title="Geometry">
          <Control label="Form"><FormPicker shape={options.shape} onSelect={shape => chooseShape(shape as ShapeId)} /></Control>
          <Control label="View"><div className="grid grid-cols-2 gap-1.5">{VIEWS.map(item => <Button key={item.id} variant={options.view === item.id ? "default" : "outline"} size="sm" className={item.id === "face-context" ? "col-span-2" : ""} onClick={() => update({ view: item.id, ...(item.id === "face" ? { pitch: 0, rotation: undefined } : {}) })}>{item.name}</Button>)}</div></Control>
          {(options.view === "face" || options.view === "face-context") && <Control label="Repeated face" value={`${options.faceIndex + 1} / ${poly.faces.length}`}><Slider min={0} max={poly.faces.length - 1} step={1} value={[options.faceIndex]} onValueChange={value => update({ faceIndex: sliderValue(value, 0) })} /></Control>}
          {family === "disphenoid" && <div className="grid grid-cols-3 gap-2">{(["a", "b", "c"] as const).map(key => <Control key={key} label={`Axis ${key.toUpperCase()}`}><Input type="number" min="0.1" max="3" step="0.05" value={options[key]} onChange={event => updateGeometry({ [key]: Number(event.target.value) })} /></Control>)}</div>}
          {family === "stephanoid" && <div className="space-y-3"><div className="grid grid-cols-3 gap-2">{(["n", "p", "q"] as const).map(key => <Control key={key} label={key === "n" ? "Rings" : `Step ${key.toUpperCase()}`}><Input type="number" min="1" step="1" value={options[key]} onChange={event => updateGeometry({ [key]: Number(event.target.value) })} /></Control>)}</div><Control label="Crown height" value={options.crownHeight.toFixed(2)}><Slider min={0.2} max={1.5} step={0.01} value={[options.crownHeight]} onValueChange={value => updateGeometry({ crownHeight: sliderValue(value, 0.7) })} /></Control></div>}
          {parameterError && <p role="alert" className="text-xs text-red-600">{parameterError}</p>}
        </Group>

        <Group title="Appearance">
          <Control label="Palette"><div className="flex gap-2">{(Object.keys(PALETTES) as PaletteName[]).map(item => <Button key={item} variant="outline" size="icon" aria-label={`${item} palette`} title={item} className={options.palette === item ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""} onClick={() => choosePalette(item)}><span className="size-5 rounded-md" style={{ background: PALETTES[item].color }} /></Button>)}</div></Control>
          <div className="grid grid-cols-2 gap-3"><Control label="Facet color"><input aria-label="Facet color" type="color" className="color-input" value={options.color} onChange={event => update({ color: event.target.value })} /></Control><Control label="Background"><input aria-label="Background color" type="color" className="color-input" value={options.background === "transparent" ? PALETTES[options.palette].background : options.background} onChange={event => update({ background: event.target.value })} /></Control></div>
          <Button variant={options.background === "transparent" ? "default" : "outline"} size="sm" className="w-full" aria-pressed={options.background === "transparent"} onClick={() => update({ background: options.background === "transparent" ? PALETTES[options.palette].background : "transparent" })}>Transparent background</Button>
        </Group>

        <Group title="Position & motion">
          <Control label="Rotation" value={options.rotation ? "trackball" : options.yaw.toFixed(2)}><Slider min={-3.14} max={3.14} step={0.01} value={[options.yaw]} onValueChange={value => update({ yaw: sliderValue(value, 0), rotation: undefined })} /></Control>
          <Control label="Tilt" value={options.rotation ? "trackball" : options.pitch.toFixed(2)}><Slider min={-1.45} max={1.45} step={0.01} value={[options.pitch]} onValueChange={value => update({ pitch: sliderValue(value, 0), rotation: undefined })} /></Control>
          {options.rotation && <Button variant="ghost" size="sm" className="w-full" onClick={() => update({ rotation: undefined })}><RotateCcw className="size-3.5" /> Reset orientation</Button>}
          <Control label="Scale" value={options.zoom.toFixed(2)}><Slider min={0.5} max={1.5} step={0.01} value={[options.zoom]} onValueChange={value => update({ zoom: sliderValue(value, 1) })} /></Control>
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-3"><Control label="Auto rotate" value={options.rotate.toFixed(2)}><Slider min={0} max={1} step={0.01} value={[options.rotate]} onValueChange={value => update({ rotate: sliderValue(value, 0) })} /></Control><Control label="Float" value={options.float.toFixed(2)}><Slider min={0} max={1} step={0.01} value={[options.float]} onValueChange={value => update({ float: sliderValue(value, 0) })} /></Control></div>
        </Group>

        <Group title="Share & inspect">
          <Control label="Design code"><textarea aria-label="Design code" className="code-input" rows={3} spellCheck={false} value={draftCode} onChange={event => setDraftCode(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") applyCode(); }} /></Control>
          {codeError && <p role="alert" className="text-xs text-red-600">{codeError}</p>}
          <div className="flex gap-2"><Button variant="outline" size="sm" className="flex-1" onClick={applyCode}>Load code</Button><Button variant="outline" size="sm" className="flex-1" onClick={() => copyText("link", shareUrl.toString())}>{copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied === "link" ? "Copied" : "Copy link"}</Button></div>
          <div className="flex items-center justify-between gap-3"><div><label htmlFor="stats" className="text-xs font-medium">Renderer stats</label><p className="text-[11px] text-muted-foreground">Local display only; excluded from the code.</p></div><input id="stats" type="checkbox" className="size-4 accent-foreground" checked={stats} onChange={event => setStats(event.target.checked)} /></div>
        </Group>
      </aside>

      <main className="preview-panel">
        <div className="preview-toolbar"><div className="min-w-0"><p className="eyebrow mb-1">Live preview <span className="mx-1">/</span> {String(shapeIndex + 1).padStart(3, "0")} of {SHAPES.length}</p><h2 className="truncate font-heading text-xl font-semibold tracking-tight">{poly.name}</h2></div><div className="preview-toolbar-actions">{regularSymbol && <div className="preview-symbol"><span>Schläfli</span><span className="font-mono">{REGULAR_SYMBOL_LABELS[options.shape]}</span></div>}<Button variant="outline" size="sm" onClick={download}><Download className="size-3.5" /> PNG</Button></div></div>
        <div className={`preview-surface ${options.background === "transparent" ? "preview-transparent" : ""}`} style={options.background === "transparent" ? undefined : { backgroundColor: options.background }}>
          <Noble innerRef={hero} {...appearanceAttrs} stats={stats ? "true" : undefined} className="preview-model" />
          {options.background === "transparent" && <span className="preview-badge">Transparent</span>}
        </div>
        <div className="preview-meta"><p>{poly.vertices.length} vertices <span>·</span> {poly.edges.length} edges <span>·</span> {poly.faces.length} faces</p><p>Drag to rotate <span>·</span> Scroll to zoom</p></div>
        <details className="math-panel" onToggle={event => setMathOpen(event.currentTarget.open)}><summary><span>Form mathematics</span><span className="math-panel-summary-value">χ = V − E + F = {eulerCharacteristic(poly)}</span></summary>{mathOpen && <Suspense fallback={<p className="math-note p-4">Loading notation…</p>}><MathPanel poly={poly} regularSymbol={regularSymbol} /></Suspense>}</details>
        <details className="embed-panel"><summary><span className="flex items-center gap-2"><Code2 className="size-4" /> Embed this form</span><span className="text-xs text-muted-foreground">Web component</span></summary><div className="embed-content"><pre><code>{snippet}</code></pre><Button variant="outline" size="sm" onClick={() => copyText("embed", snippet)}>{copied === "embed" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied === "embed" ? "Copied" : "Copy code"}</Button></div></details>
      </main>
    </div>}
  </div>;
}

createRoot(document.getElementById("app")!).render(<App />);
