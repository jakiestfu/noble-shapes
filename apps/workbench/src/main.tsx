import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine, ArrowRight, Check, Copy, RotateCcw, Shuffle, SlidersHorizontal } from "lucide-react";
import { createPolyhedron, seededDefaults, SHAPES, type ShapeId } from "@noble-polyhedra/core";
import "@noble-polyhedra/web-component";
import type { NoblePolyhedronElement } from "@noble-polyhedra/web-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormPicker } from "@/components/form-picker";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import "./style.css";

type View = "solid" | "solid-wireframe" | "wireframe" | "face" | "face-context";
type Palette = "aurora" | "coral" | "violet" | "gold";
const VIEWS: { id: View; name: string }[] = [
  { id: "solid", name: "Shaded" }, { id: "solid-wireframe", name: "Shaded + edges" },
  { id: "wireframe", name: "Wireframe" }, { id: "face", name: "One face" },
  { id: "face-context", name: "Face + wireframe" },
];
const PALETTES: Record<Palette, { color: string; background: string }> = {
  aurora: { color: "#5ce0d3", background: "#07131d" },
  coral: { color: "#ffad8c", background: "#21101b" },
  violet: { color: "#c0adff", background: "#131025" },
  gold: { color: "#ffce83", background: "#20150d" },
};
const FAVORITES: ShapeId[] = ["small-stellated-dodecahedron", "great-stellated-dodecahedron", "great-dodecahedron", "great-icosahedron"];
const sliderValue = (value: number | readonly number[], fallback: number): number => typeof value === "number" ? value : value[0] ?? fallback;

function Noble({ innerRef, ...attributes }: { innerRef?: React.Ref<NoblePolyhedronElement>; [key: string]: string | React.Ref<NoblePolyhedronElement> | undefined }) {
  return createElement("noble-polyhedron", { ...attributes, ref: innerRef });
}

function Control({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between text-xs font-medium"><span>{label}</span>{value && <span className="font-mono text-muted-foreground">{value}</span>}</div>{children}</div>;
}

function App() {
  const [shape, setShape] = useState<string>("small-stellated-dodecahedron");
  const [seed, setSeed] = useState("noble-01");
  const [palette, setPalette] = useState<Palette>("aurora");
  const [color, setColor] = useState(PALETTES.aurora.color);
  const [background, setBackground] = useState(PALETTES.aurora.background);
  const [customColors, setCustomColors] = useState(false);
  const [view, setView] = useState<View>("solid-wireframe");
  const [viewTouched, setViewTouched] = useState(false);
  const [faceIndex, setFaceIndex] = useState(0);
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(0.72);
  const [rotation, setRotation] = useState<string | undefined>();
  const [zoom, setZoom] = useState(1);
  const [stats, setStats] = useState(true);
  const [copied, setCopied] = useState(false);
  const [n, setN] = useState(5), [p, setP] = useState(3), [q, setQ] = useState(1);
  const [crownHeight, setCrownHeight] = useState(0.7);
  const [a, setA] = useState(1.15), [b, setB] = useState(0.9), [c, setC] = useState(0.75);
  const hero = useRef<NoblePolyhedronElement>(null);
  const previousPitch = useRef(pitch);
  const resolved = shape === "random" ? seededDefaults(seed).shape : shape as ShapeId;
  const family = resolved === "disphenoid" ? "disphenoid" : resolved === "stephanoid" || resolved === "antistephanoid" ? "stephanoid" : "finite";
  const result = useMemo(() => {
    try { return { poly: createPolyhedron({ shape: resolved, n, p, q, crownHeight, a, b, c }), error: "" }; }
    catch (error) { return { poly: undefined, error: error instanceof Error ? error.message : String(error) }; }
  }, [resolved, n, p, q, crownHeight, a, b, c]);
  const poly = result.poly;
  const selectedFace = Math.min(faceIndex, Math.max(0, (poly?.faces.length ?? 1) - 1));
  const shapeIndex = SHAPES.findIndex(item => item.id === resolved);
  const descriptor = SHAPES[shapeIndex];

  useEffect(() => {
    if (!viewTouched && poly) setView(poly.edges.length > 100 ? "solid" : "solid-wireframe");
  }, [resolved, poly, viewTouched]);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    const onChange = () => {
      setRotation(element.getAttribute("rotation") ?? undefined);
      setZoom(Number(element.getAttribute("zoom") ?? 1));
    };
    element.addEventListener("change", onChange);
    return () => element.removeEventListener("change", onChange);
  }, []);

  const chooseView = (next: View) => {
    setViewTouched(true);
    if (next === "face" && view !== "face") { previousPitch.current = pitch; setPitch(0); setRotation(undefined); }
    if (view === "face" && next !== "face") { setPitch(previousPitch.current); setRotation(undefined); }
    setView(next);
  };
  const applySeed = (value: string) => {
    setSeed(value);
    const defaults = seededDefaults(value);
    setYaw(defaults.yaw); setPitch(defaults.pitch); setRotation(undefined);
  };
  const choosePalette = (next: Palette) => {
    setPalette(next); setColor(PALETTES[next].color); setBackground(PALETTES[next].background); setCustomColors(false);
  };
  const attrs: Record<string, string | undefined> = {
    shape, seed, palette, color: customColors ? color : undefined, background: customColors ? background : undefined,
    yaw: String(yaw), pitch: String(pitch), rotation, zoom: String(zoom), view,
    "face-index": view === "face" || view === "face-context" ? String(selectedFace) : undefined,
    stats: stats ? "" : undefined,
    n: family === "stephanoid" ? String(n) : undefined,
    p: family === "stephanoid" ? String(p) : undefined,
    q: family === "stephanoid" ? String(q) : undefined,
    "crown-height": family === "stephanoid" ? String(crownHeight) : undefined,
    a: family === "disphenoid" ? String(a) : undefined,
    b: family === "disphenoid" ? String(b) : undefined,
    c: family === "disphenoid" ? String(c) : undefined,
  };
  const snippet = `import "@noble-polyhedra/web-component";\n\n<noble-polyhedron\n${Object.entries(attrs).filter(([, value]) => value !== undefined).map(([key, value]) => value === "" ? `  ${key}` : `  ${key}="${value}"`).join("\n")}\n></noble-polyhedron>`;

  const download = () => hero.current?.canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `noble-${resolved}.png`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <a href="#top" className="font-heading text-xl font-extrabold uppercase tracking-[-0.05em]">Noble <span className="font-normal text-muted-foreground">/</span> Forms</a>
      <nav className="hidden gap-7 text-sm text-muted-foreground sm:flex"><a href="#workbench" className="hover:text-foreground">Workbench</a><a href="#explore" className="hover:text-foreground">Explore</a><a href="#embed" className="hover:text-foreground">Embed</a></nav>
      <span className="hidden rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:block">a study in symmetry</span>
    </div></header>

    <main id="top" className="mx-auto max-w-7xl px-5 sm:px-8">
      <section className="grid gap-7 border-b border-border py-16 md:grid-cols-[1fr_auto] md:items-end md:py-20">
        <div><p className="eyebrow">Geometry, made personal</p><h1 className="max-w-3xl font-heading text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.065em] sm:text-7xl">Every angle<br /><span className="font-serif normal-case italic font-normal tracking-[-0.06em]">has a story.</span></h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">Explore noble polyhedra, tune their color and form, and make an image worth keeping.</p>
          <a href="#workbench" className="mt-5 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium">Open the workbench <ArrowRight className="size-4" /></a>
        </div>
        <div className="font-mono text-[10px] uppercase leading-5 tracking-widest text-muted-foreground md:text-right"><span className="block text-foreground">{SHAPES.filter(item => item.family === "Finite").length} forms available</span>146 known finite forms<br />+ two infinite families</div>
      </section>

      <section id="workbench" className="py-12 md:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">01 / The workbench</p><h2 className="section-title">Shape the extraordinary.</h2></div><p className="text-xs text-muted-foreground">Drag to rotate · Scroll to zoom</p></div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.8fr)]">
          <Card className="overflow-hidden bg-white"><div className="relative border-b border-border"><div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/80"><span className="size-1.5 rounded-full bg-white" /> Live preview</div>
            <Noble innerRef={hero} {...attrs} className="h-[440px] w-full sm:h-[530px]" />
          </div><div className="flex flex-wrap items-end justify-between gap-3 p-5"><div><p className="eyebrow mb-1">Current form · {String(shapeIndex + 1).padStart(2, "0")} / {SHAPES.length}</p><h3 className="font-heading text-xl font-semibold tracking-tight">{poly?.name ?? descriptor?.name ?? resolved}</h3></div><p className="font-mono text-[11px] text-muted-foreground">{poly ? `${poly.vertices.length} vertices · ${poly.edges.length} edges · ${poly.faces.length} faces` : result.error}</p></div></Card>

          <Card><CardHeader className="border-b border-border pb-4"><div className="flex items-center gap-2"><SlidersHorizontal className="size-4" /><h3 className="font-heading text-lg font-semibold">Make it yours</h3></div><p className="mt-1 text-xs text-muted-foreground">Choose a form, then find its character.</p></CardHeader>
            <CardContent className="space-y-5 pt-5">
              <Control label="Form"><FormPicker shape={shape} onSelect={next => { setShape(next); setRotation(undefined); setFaceIndex(0); setViewTouched(false); }} /></Control>
              <Control label="View"><div className="grid grid-cols-2 gap-1.5">{VIEWS.map(item => <Button key={item.id} variant={view === item.id ? "default" : "outline"} size="sm" className={item.id === "face-context" ? "col-span-2" : ""} onClick={() => chooseView(item.id)}>{item.name}</Button>)}</div></Control>
              {(view === "face" || view === "face-context") && poly && <Control label="Repeated face" value={`${selectedFace + 1} of ${poly.faces.length}`}><Slider min={0} max={poly.faces.length - 1} step={1} value={[selectedFace]} onValueChange={value => setFaceIndex(sliderValue(value, 0))} /></Control>}
              <Control label="Seed"><div className="flex gap-2"><Input id="seed" value={seed} onChange={event => applySeed(event.target.value)} spellCheck={false} /><Button variant="outline" size="icon" aria-label="New seed" title="New seed" onClick={() => applySeed(Math.random().toString(36).slice(2, 10))}><Shuffle className="size-4" /></Button></div></Control>
              {family === "disphenoid" && <div className="grid grid-cols-3 gap-2">{[["Axis A", a, setA], ["Axis B", b, setB], ["Axis C", c, setC]].map(([label, value, setter]) => <Control key={String(label)} label={String(label)}><Input type="number" min="0.1" step="0.05" value={Number(value)} onChange={event => (setter as (value: number) => void)(Number(event.target.value))} /></Control>)}</div>}
              {family === "stephanoid" && <div className="space-y-3 rounded-lg bg-muted/60 p-3"><div className="grid grid-cols-3 gap-2">{[["Rings", n, setN], ["Step P", p, setP], ["Step Q", q, setQ]].map(([label, value, setter]) => <Control key={String(label)} label={String(label)}><Input type="number" min="1" step="1" value={Number(value)} onChange={event => (setter as (value: number) => void)(Number(event.target.value))} /></Control>)}</div><Control label="Height" value={crownHeight.toFixed(2)}><Slider min={0.2} max={1.5} step={0.05} value={[crownHeight]} onValueChange={value => setCrownHeight(sliderValue(value, 0.7))} /></Control></div>}
              <Control label="Palette"><div className="flex gap-2">{(Object.keys(PALETTES) as Palette[]).map(item => <Button key={item} variant="outline" size="icon" aria-label={`${item} palette`} title={item} className={palette === item && !customColors ? "ring-2 ring-foreground ring-offset-2" : ""} onClick={() => choosePalette(item)}><span className="size-5 rounded-md" style={{ background: PALETTES[item].color }} /></Button>)}</div></Control>
              <div className="grid grid-cols-2 gap-3"><Control label="Facet color"><input aria-label="Facet color" type="color" className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1" value={color} onChange={event => { setColor(event.target.value); setCustomColors(true); }} /></Control><Control label="Background"><input aria-label="Background" type="color" className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1" value={background} onChange={event => { setBackground(event.target.value); setCustomColors(true); }} /></Control></div>
              <Control label="Rotation" value={rotation ? "trackball" : yaw.toFixed(2)}><Slider min={-3.14} max={3.14} step={0.01} value={[yaw]} onValueChange={value => { setYaw(sliderValue(value, 0)); setRotation(undefined); }} /></Control>
              <Control label="Tilt" value={rotation ? "trackball" : pitch.toFixed(2)}><Slider min={-1.45} max={1.45} step={0.01} value={[pitch]} onValueChange={value => { setPitch(sliderValue(value, 0)); setRotation(undefined); }} /></Control>
              {rotation && <Button variant="ghost" size="sm" className="w-full" onClick={() => setRotation(undefined)}><RotateCcw className="size-3.5" /> Reset orientation</Button>}
              <Control label="Scale" value={zoom.toFixed(2)}><Slider min={0.5} max={1.5} step={0.01} value={[zoom]} onValueChange={value => setZoom(sliderValue(value, 1))} /></Control>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-4"><div><label htmlFor="stats" className="text-xs font-medium">Renderer stats</label><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Draw FPS, render time, latency, pixels and geometry.</p></div><input id="stats" type="checkbox" className="mt-0.5 size-4 accent-foreground" checked={stats} onChange={event => setStats(event.target.checked)} /></div>
              <Button className="w-full" size="lg" onClick={download}><ArrowDownToLine className="size-4" /> Download PNG</Button>
            </CardContent></Card>
        </div>
      </section>

      <section id="explore" className="border-t border-border py-12 md:py-16"><p className="eyebrow">02 / A few favorites</p><h2 className="section-title">Curiosity has many faces.</h2><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{FAVORITES.map((id, index) => <button key={id} className="group overflow-hidden rounded-xl bg-card text-left ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/35" onClick={() => { setShape(id); setRotation(undefined); setViewTouched(false); document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth" }); }}><Noble shape={id} seed={`favorite-${index}`} palette={(Object.keys(PALETTES) as Palette[])[index]} yaw="0.6" pitch="0.72" className="aspect-square w-full" /><span className="flex items-center justify-between gap-2 p-3 text-xs font-medium"><span>{SHAPES.find(item => item.id === id)?.name ?? id}</span><ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" /></span></button>)}</div></section>

      <section id="embed" className="grid gap-7 border-t border-border py-12 md:grid-cols-[0.8fr_1.2fr] md:py-16"><div><p className="eyebrow">03 / Take it with you</p><h2 className="section-title">A universe in <span className="font-serif italic font-normal">one little tag.</span></h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">The same settings render in a native web component or in Node for avatars, cards and generated imagery.</p></div><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><span>Web component</span><Button variant="ghost" size="sm" onClick={async () => { await navigator.clipboard.writeText(snippet); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy code"}</Button></div><pre className="overflow-x-auto p-4 text-xs leading-5"><code>{snippet}</code></pre></Card></section>
    </main><footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:px-8"><span className="font-heading font-bold uppercase text-foreground">Noble / Forms</span><span>Inspired by the mathematics of noble polyhedra.</span><a className="underline underline-offset-4" href="https://arxiv.org/abs/2607.28711" target="_blank" rel="noreferrer">Read the research</a></div></footer>
  </div>;
}

createRoot(document.getElementById("app")!).render(<App />);
