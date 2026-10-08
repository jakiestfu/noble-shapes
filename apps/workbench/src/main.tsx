"use client";

import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Box, Braces, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, Copy, Download, FileImage, Moon, RotateCcw, Share2, Shuffle, Star, Sun } from "lucide-react";
import { createPolyhedron, polyhedronToGlb, SHAPES, type ShapeId } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS, DEFAULT_WORKBENCH_OPTIONS, designForTheme, optionsToString, PALETTES, paletteColors, randomOptions, randomSeed, stringToOptions, type DesignOptions, type PaletteName, type Quaternion, type RenderView, type WorkbenchOptions } from "@noble-shapes/render";
import "noble-shapes/web-component";
import "noble-shapes/react";
import type { NobleShapeElement } from "noble-shapes/web-component";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CodePreview } from "@/components/code-preview";
import { FormPicker } from "@/components/form-picker";
import { LoadingState } from "@/components/loading-state";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { eulerCharacteristic, REGULAR_SYMBOLS } from "@/lib/shape-math";
import { workbenchCodeFormats } from "@/lib/workbench-code";
import { Research } from "@/views/research";
import { PRODUCT, PROJECT_GITHUB_URL } from "@/lib/resources";

const Showcase = lazy(() => import("@/views/showcase").then(module => ({ default: module.Showcase })));
const Documentation = lazy(() => import("@/views/documentation").then(module => ({ default: module.Documentation })));
const MathText = lazy(() => import("@/components/math-text").then(module => ({ default: module.MathText })));

type Page = "home" | "create" | "showcase" | "research" | "documentation";
const pageFromPath = (path: string, search = ""): Page => {
  const normalized = path.replace(/\/+$/, "");
  if (normalized === "/" || !normalized) return new URLSearchParams(search).has("code") ? "create" : "home";
  if (normalized === "/workbench") return "create";
  return normalized === "/create" || normalized === "/showcase" || normalized === "/research" || normalized === "/documentation" ? normalized.slice(1) as Page : "home";
};
const pathForPage = (page: Page): string => page === "home" ? "/" : `/${page}`;

const VIEWS: { id: RenderView; name: string }[] = [
  { id: "solid", name: "Whole shape" }, { id: "wireframe", name: "Wireframe" }, { id: "face", name: "One face" },
  { id: "face-context", name: "Face + wireframe" },
];
const sliderValue = (value: number | readonly number[], fallback: number): number => typeof value === "number" ? value : value[0] ?? fallback;
function sceneIsLight(background: string, theme: "light" | "dark"): boolean {
  if (background === "transparent") return theme === "light";
  const channels = [1, 3, 5].map(offset => {
    const value = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722 > 0.179;
}
const THEME_STORAGE_KEY = "noble-shapes-theme";
const OLD_VIEWER_STORAGE_KEY = "noble-forms-viewer-v1";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
function readThemePreference(): "light" | "dark" | undefined {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem("noble-polyhedra-theme");
    return value === "light" || value === "dark" ? value : undefined;
  } catch { return undefined; }
}
const savedTheme = readThemePreference();
const initialTheme = savedTheme ?? (systemTheme.matches ? "dark" : "light");
try { localStorage.removeItem(OLD_VIEWER_STORAGE_KEY); } catch { /* Storage may be disabled. */ }
const DEFAULT_CODE = optionsToString(DEFAULT_DESIGN_OPTIONS);
const defaultWorkbench = (design: DesignOptions, theme: "light" | "dark"): WorkbenchOptions =>
  designForTheme({ ...DEFAULT_WORKBENCH_OPTIONS, ...design, theme }, theme);

function readLocation(): { design: DesignOptions; error: string } {
  const code = new URL(window.location.href).searchParams.get("code");
  if (!code) return { design: DEFAULT_DESIGN_OPTIONS, error: "" };
  try { return { design: stringToOptions(code), error: "" }; }
  catch (error) { return { design: DEFAULT_DESIGN_OPTIONS, error: error instanceof Error ? error.message : String(error) }; }
}
const initial = readLocation();
document.documentElement.dataset.theme = initialTheme;

function Control({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3 text-xs font-medium"><span>{label}</span>{value && <span className="font-mono text-muted-foreground">{value}</span>}</div>{children}</div>;
}
function Group({ id, title, expanded, onToggle, headerAction, children }: { id: string; title: string; expanded: boolean; onToggle: () => void; headerAction?: ReactNode; children: ReactNode }) {
  return <section className={`control-group ${expanded ? "is-open" : ""}`}>
    <div className="control-group-header"><button type="button" className="control-group-hit" aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`} aria-expanded={expanded} aria-controls={`${id}-controls`} onClick={onToggle} /><h3>{title}</h3>{headerAction}<ChevronDown aria-hidden="true" className="control-group-chevron size-3.5" /></div>
    <div id={`${id}-controls`} className="control-group-content" hidden={!expanded}><div className="control-group-body space-y-4">{children}</div></div>
  </section>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  const commit = () => {
    const candidate = (draft.startsWith("#") ? draft : `#${draft}`).toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(candidate)) onChange(candidate);
    else setDraft(value.toUpperCase());
  };
  return <div className="color-control"><span className="color-control-label">{label}</span><div className="color-field">
    <label className="color-swatch" style={{ background: value }} title={`Choose ${label.toLowerCase()}`}><span className="sr-only">Choose {label.toLowerCase()}</span><input type="color" aria-label={`Choose ${label.toLowerCase()}`} value={value} onChange={event => onChange(event.target.value)} /></label>
    <input aria-label={`${label} hex color`} value={draft} maxLength={7} spellCheck={false} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
  </div></div>;
}

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname, window.location.search));
  const [options, setOptions] = useState<WorkbenchOptions>(() => defaultWorkbench(initial.design, initialTheme));
  const [stats, setStats] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(!reducedMotion.matches);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(["shape"]));
  const accordionRef = useRef<HTMLDivElement>(null);
  const [opaqueBackground, setOpaqueBackground] = useState(options.background === "transparent" ? paletteColors(options.palette, options.theme).background : options.background);
  const [codeError, setCodeError] = useState(initial.error);
  const [parameterError, setParameterError] = useState("");
  const [identity, setIdentity] = useState("");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [edgesPreferred, setEdgesPreferred] = useState(initial.design.view === "solid-wireframe");
  const [copied, setCopied] = useState<"link" | "">("");
  const [githubStars, setGithubStars] = useState<number | null>(null);
  const code = useMemo(() => optionsToString(options), [options.shape, options.view, options.material, options.palette, options.paletteLinked,
    options.color, options.background, options.faceIndex, options.n, options.p, options.q,
    options.crownHeight, options.a, options.b, options.c]);
  const [draftCode, setDraftCode] = useState(code);
  const hero = useRef<NobleShapeElement>(null);
  const replacingDesign = useRef(false);
  const hasThemeOverride = useRef(savedTheme !== undefined);
  const family = options.shape === "disphenoid" ? "disphenoid" : options.shape === "stephanoid" || options.shape === "antistephanoid" ? "stephanoid" : "finite";
  const poly = useMemo(() => createPolyhedron(options), [options.shape, options.n, options.p, options.q, options.crownHeight, options.a, options.b, options.c]);
  const shapeIndex = SHAPES.findIndex(item => item.id === options.shape);
  const regularSymbol = REGULAR_SYMBOLS[options.shape];
  const lightScene = sceneIsLight(options.background, options.theme);

  useLayoutEffect(() => {
    const accordion = accordionRef.current;
    if (!accordion) return;
    const groups = Array.from(accordion.querySelectorAll<HTMLElement>(".control-group"));
    const measure = () => {
      const required = groups.reduce((height, group) => {
        const header = group.querySelector<HTMLElement>(".control-group-header")!;
        const body = group.querySelector<HTMLElement>(".control-group-body")!;
        return height + header.offsetHeight + (group.classList.contains("is-open") ? body.scrollHeight : 0);
      }, 0);
      accordion.dataset.constrained = required > accordion.clientHeight + 1 ? "true" : "false";
    };
    const observer = new ResizeObserver(measure);
    observer.observe(accordion);
    for (const group of groups) observer.observe(group.querySelector<HTMLElement>(".control-group-body")!);
    measure();
    return () => observer.disconnect();
  }, [expandedSections]);

  useEffect(() => { document.documentElement.dataset.theme = options.theme; }, [options.theme]);
  useEffect(() => {
    if (page !== "home" || !PROJECT_GITHUB_URL || githubStars !== null) return;
    const controller = new AbortController();
    const repository = new URL(PROJECT_GITHUB_URL).pathname.replace(/^\/+|\/+$/g, "");
    fetch(`https://api.github.com/repos/${repository}`, { signal: controller.signal, headers: { Accept: "application/vnd.github+json" } })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (typeof data?.stargazers_count === "number") setGithubStars(data.stargazers_count); })
      .catch(() => { /* The repository link remains usable when the count is unavailable. */ });
    return () => controller.abort();
  }, [page, githubStars]);
  useEffect(() => {
    const onSystemTheme = (event: MediaQueryListEvent) => {
      if (hasThemeOverride.current) return;
      const theme = event.matches ? "dark" : "light";
      setOptions(previous => designForTheme({ ...previous, theme }, theme));
    };
    systemTheme.addEventListener("change", onSystemTheme);
    return () => systemTheme.removeEventListener("change", onSystemTheme);
  }, []);
  useEffect(() => { if (options.view === "solid" || options.view === "solid-wireframe") setEdgesPreferred(options.view === "solid-wireframe"); }, [options.view]);
  useEffect(() => { if (options.background !== "transparent") setOpaqueBackground(options.background); }, [options.background]);
  const toggleTheme = () => {
    const theme = options.theme === "light" ? "dark" : "light";
    hasThemeOverride.current = true;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Storage may be disabled. */ }
    setOptions(previous => designForTheme({ ...previous, theme }, theme));
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== "d") return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], [role="combobox"], [role="listbox"]')) return;
      event.preventDefault();
      toggleTheme();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options.theme]);
  useEffect(() => {
    document.title = page === "home" ? PRODUCT.name : `${page.charAt(0).toUpperCase() + page.slice(1)} — ${PRODUCT.name}`;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", `${PRODUCT.url}${pathForPage(page)}`);
  }, [page]);
  useLayoutEffect(() => {
    if (replacingDesign.current && hero.current) {
      if (options.rotation) hero.current.setAttribute("rotation", options.rotation.join(","));
      else hero.current.removeAttribute("rotation");
    }
    replacingDesign.current = false;
  }, [options, page]);
  useEffect(() => {
    setDraftCode(code);
    if (page !== "create") return;
    const url = new URL(window.location.href);
    if (url.pathname === "/" || url.pathname === "/workbench") url.pathname = "/create";
    if (code === DEFAULT_CODE) url.searchParams.delete("code");
    else url.searchParams.set("code", code);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [code, page]);
  useEffect(() => {
    const onPopState = () => {
      const nextPage = pageFromPath(window.location.pathname, window.location.search);
      setPage(nextPage);
      if (nextPage === "create") {
        const next = readLocation();
        setOptions(previous => defaultWorkbench(next.design, previous.theme));
        setStats(false); setAnimationEnabled(!reducedMotion.matches);
        setExpandedSections(new Set(["shape"])); setIdentityOpen(false); setIdentity("");
        setCodeError(next.error); setParameterError("");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (page !== "create") return;
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
    if (nextPage === page && nextPage !== "create") return;
    const url = new URL(pathForPage(nextPage), window.location.origin);
    window.history.pushState(null, "", url);
    if (nextPage === "create") {
      setOptions(previous => defaultWorkbench(DEFAULT_DESIGN_OPTIONS, previous.theme));
      setStats(false); setAnimationEnabled(!reducedMotion.matches);
      setExpandedSections(new Set(["shape"])); setIdentityOpen(false); setIdentity("");
      setCodeError(""); setParameterError("");
    }
    setPage(nextPage);
  };
  const navClick = (event: React.MouseEvent<HTMLAnchorElement>, target: Page) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(target);
  };

  const update = (patch: Partial<WorkbenchOptions>) => { setOptions(previous => ({ ...previous, ...patch })); setCodeError(""); };
  const toggleSection = (id: string) => setExpandedSections(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAnimation = () => {
    if (!animationEnabled && options.rotate === 0 && options.float === 0) update({ rotate: 0.25, float: 0.25 });
    setAnimationEnabled(enabled => !enabled);
  };
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
  const stepShape = (direction: -1 | 1) => {
    const next = SHAPES[(shapeIndex + direction + SHAPES.length) % SHAPES.length];
    if (next) chooseShape(next.id);
  };
  useEffect(() => {
    if (page !== "create") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], [role="combobox"], [role="listbox"], [role="slider"], [data-slot="combobox-content"]')) return;
      event.preventDefault();
      stepShape(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [page, shapeIndex]);
  const choosePalette = (palette: PaletteName) => update({ palette, paletteLinked: true, ...paletteColors(palette, options.theme),
    ...(options.background === "transparent" ? { background: "transparent" } : {}) });
  const applyCode = () => {
    try {
      const decoded = stringToOptions(draftCode.trim());
      setOptions(previous => ({ ...previous, ...designForTheme(decoded, previous.theme) }));
      setCodeError(""); setParameterError("");
    }
    catch (error) { setCodeError(error instanceof Error ? error.message : String(error)); }
  };
  const generateFromText = (seed: string) => {
    const next = randomOptions(seed);
    setOptions(previous => ({ ...previous, ...designForTheme(next, previous.theme) }));
    setCodeError(""); setParameterError("");
  };
  const surpriseMe = () => {
    const seed = randomSeed();
    const next = randomOptions(seed);
    setOptions(previous => ({
      ...previous,
      ...designForTheme(next, previous.theme),
      view: previous.view,
      background: previous.background === "transparent" ? "transparent"
        : paletteColors(next.palette, previous.theme).background,
    }));
    setCodeError(""); setParameterError("");
  };
  const copyText = async (kind: "link", text: string) => {
    await navigator.clipboard.writeText(text); setCopied(kind);
    window.setTimeout(() => setCopied(""), 1600);
  };

  const appearanceAttrs: Record<string, string | undefined> = {
    shape: options.shape, view: options.view, material: options.material, palette: options.palette, color: options.color,
    background: options.background, yaw: String(options.yaw), pitch: String(options.pitch),
    rotation: options.rotation?.join(","), zoom: String(options.zoom),
    "face-index": options.view === "face" || options.view === "face-context" ? String(options.faceIndex) : undefined,
    rotate: animationEnabled && options.rotate > 0 ? String(options.rotate) : undefined,
    float: animationEnabled && options.float > 0 ? String(options.float) : undefined,
    n: family === "stephanoid" ? String(options.n) : undefined,
    p: family === "stephanoid" ? String(options.p) : undefined,
    q: family === "stephanoid" ? String(options.q) : undefined,
    "crown-height": family === "stephanoid" ? String(options.crownHeight) : undefined,
    a: family === "disphenoid" ? String(options.a) : undefined,
    b: family === "disphenoid" ? String(options.b) : undefined,
    c: family === "disphenoid" ? String(options.c) : undefined,
  };
  const codeFormats = workbenchCodeFormats(options, appearanceAttrs);
  const shareUrl = new URL("/create", window.location.origin); shareUrl.searchParams.set("code", code);
  const saveBlob = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `noble-${options.shape}.${extension}`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadPng = () => {
    const source = hero.current?.canvas;
    if (!source) return;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (options.background !== "transparent") { context.fillStyle = options.background; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(source, 0, 0);
    canvas.toBlob(blob => {
      if (blob) saveBlob(blob, "png");
    }, "image/png");
  };
  const downloadGlb = () => {
    const bytes = polyhedronToGlb(poly, options.color);
    saveBlob(new Blob([bytes], { type: "model/gltf-binary" }), "glb");
  };
  const downloadGeometry = () => {
    const parameters = family === "disphenoid" ? { a: options.a, b: options.b, c: options.c }
      : family === "stephanoid" ? { n: options.n, p: options.p, q: options.q, crownHeight: options.crownHeight } : {};
    const data = { format: "noble-shapes/geometry-v1", parameters, ...poly };
    saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "json");
  };

  const homeDesign = DEFAULT_DESIGN_OPTIONS;
  return <div className={`app-shell ${page === "create" ? "is-workbench" : ""} ${page === "home" ? "is-home" : ""} ${page === "create" && options.background === "transparent" ? "is-transparent" : ""}`} style={page === "create" ? { "--scene-background": options.background === "transparent" ? "var(--background)" : options.background, "--scene-color": options.color } as CSSProperties : page === "home" ? { "--scene-background": homeDesign.background, "--scene-color": homeDesign.color } as CSSProperties : undefined}>
    <header className={`app-header ${page === "home" ? "is-home-header" : ""}`}>
      <div className="brand-lockup"><a className="brand-product" href="/" onClick={event => navClick(event, "home")}>{PRODUCT.name}</a></div>
      {page !== "home" && <nav className="app-nav" aria-label="Main navigation">{(["create", "showcase", "research"] as const).map(item => <a key={item} href={pathForPage(item)} className={`app-nav-link ${page === item ? "is-active" : ""}`} aria-current={page === item ? "page" : undefined} onClick={event => navClick(event, item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</a>)}</nav>}
      <div className="header-actions"><a href="/documentation" className={`header-docs-link ${page === "documentation" ? "is-active" : ""}`} aria-current={page === "documentation" ? "page" : undefined} onClick={event => navClick(event, "documentation")}>Docs</a><Button variant="ghost" size="icon" aria-label={`Switch to ${options.theme === "light" ? "dark" : "light"} mode`} title="Toggle theme (D)" onClick={toggleTheme}>{options.theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button></div>
    </header>

    {page === "home" ? <main className="home-hero">
      <div className="home-model"><noble-shape shape={homeDesign.shape} view={homeDesign.view} material={homeDesign.material} color={homeDesign.color} background="transparent" yaw="0.6" pitch="0.72" rotate={!reducedMotion.matches ? "0.25" : undefined} float={!reducedMotion.matches ? "0.25" : undefined} aria-label={SHAPES.find(item => item.id === homeDesign.shape)?.name ?? "Noble polyhedron"} /></div>
      <div className="home-content"><p className="home-shape-name">Small stellated dodecahedron</p><h1>Noble Shapes</h1><p className="home-description">A noble polyhedron has one kind of vertex and one kind of face.</p><p className="home-kicker">146 finite forms · two infinite families</p><nav className="home-tabs" aria-label="Explore Noble Shapes">{(["create", "showcase", "research"] as const).map(item => <a key={item} href={pathForPage(item)} onClick={event => navClick(event, item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</a>)}</nav>{PROJECT_GITHUB_URL && <a className="github-stars" href={PROJECT_GITHUB_URL} target="_blank" rel="noopener noreferrer"><Star aria-hidden="true" className="size-4" /><span>Star on GitHub</span>{githubStars !== null && <span className="github-stars-count">{githubStars.toLocaleString()}</span>}</a>}</div>
    </main> : page === "showcase" ? <Suspense fallback={<main className="content-page loading-page" aria-busy="true"><LoadingState label="Loading showcase" /></main>}><Showcase /></Suspense> : page === "research" ? <Research /> : page === "documentation" ? <Suspense fallback={<main className="content-page loading-page" aria-busy="true"><LoadingState label="Loading documentation" /></main>}><Documentation /></Suspense> : <div className="app-layout">
      <aside className="control-panel">
        <div className="control-intro"><h1 className="font-heading text-xl font-bold tracking-tight">Create</h1><p className="mt-1 text-xs text-muted-foreground">146 finite polyhedra · two infinite families</p></div>

        <div className="control-accordion" ref={accordionRef}>
        <Group id="shape" title="Shape" expanded={expandedSections.has("shape")} onToggle={() => toggleSection("shape")}>
          <Control label="Polyhedron" value={`${shapeIndex + 1} / ${SHAPES.length}`}><div className="shape-selector"><FormPicker shape={options.shape} onSelect={shape => chooseShape(shape as ShapeId)} /><div className="shape-step-links"><button type="button" className="shape-step-link" title="Previous shape (←)" onClick={() => stepShape(-1)}><ChevronLeft aria-hidden="true" /> Previous</button><button type="button" className="shape-step-link" title="Next shape (→)" onClick={() => stepShape(1)}>Next <ChevronRight aria-hidden="true" /></button></div></div></Control>
          <div className="design-actions">
            <div className="design-actions-head">
              <Button variant="ghost" size="sm" className="surprise-action" onClick={surpriseMe}><Shuffle className="size-3.5" /> Surprise me</Button>
              <button type="button" className="identity-toggle" aria-expanded={identityOpen} onClick={() => setIdentityOpen(open => !open)}>From text <span aria-hidden="true">{identityOpen ? "−" : "+"}</span></button>
            </div>
            {identityOpen && <div className="identity-controls">
              <form className="identity-form" onSubmit={event => { event.preventDefault(); if (identity.trim()) generateFromText(identity.trim()); }}><Input id="identity" aria-label="Text for repeatable design" value={identity} placeholder="username" onChange={event => setIdentity(event.target.value)} /><Button variant="ghost" size="sm" type="submit" disabled={!identity.trim()}>Generate</Button></form>
              <p>Same text produces the same design.</p>
            </div>}
          </div>
          <Control label="View"><div className="view-options">{VIEWS.map(item => { const selected = item.id === "solid" ? options.view === "solid" || options.view === "solid-wireframe" : options.view === item.id; return <Button key={item.id} variant="ghost" aria-pressed={selected} size="sm" className={selected ? "is-selected" : ""} onClick={() => update({ view: item.id === "solid" && edgesPreferred ? "solid-wireframe" : item.id, ...(item.id === "face" ? { pitch: 0, rotation: undefined } : {}) })}>{item.name}</Button>; })}</div></Control>
          {(options.view === "solid" || options.view === "solid-wireframe") && <label className="control-check"><input type="checkbox" checked={options.view === "solid-wireframe"} onChange={event => { setEdgesPreferred(event.target.checked); update({ view: event.target.checked ? "solid-wireframe" : "solid" }); }} /><span>Show edges</span></label>}
          {(options.view === "face" || options.view === "face-context") && <Control label="Repeated face" value={`${options.faceIndex + 1} / ${poly.faces.length}`}><Slider min={0} max={poly.faces.length - 1} step={1} value={[options.faceIndex]} onValueChange={value => update({ faceIndex: sliderValue(value, 0) })} /></Control>}
          {family === "disphenoid" && <div className="grid grid-cols-3 gap-2">{(["a", "b", "c"] as const).map(key => <Control key={key} label={`Axis ${key.toUpperCase()}`}><Input type="number" min="0.1" max="3" step="0.05" value={options[key]} onChange={event => updateGeometry({ [key]: Number(event.target.value) })} /></Control>)}</div>}
          {family === "stephanoid" && <div className="space-y-3"><div className="grid grid-cols-3 gap-2">{(["n", "p", "q"] as const).map(key => <Control key={key} label={key === "n" ? "Rings" : `Step ${key.toUpperCase()}`}><Input type="number" min="1" step="1" value={options[key]} onChange={event => updateGeometry({ [key]: Number(event.target.value) })} /></Control>)}</div><Control label="Crown height" value={options.crownHeight.toFixed(2)}><Slider min={0.2} max={1.5} step={0.01} value={[options.crownHeight]} onValueChange={value => updateGeometry({ crownHeight: sliderValue(value, 0.7) })} /></Control></div>}
          {parameterError && <p role="alert" className="text-xs text-red-600">{parameterError}</p>}
        </Group>

        <Group id="appearance" title="Appearance" expanded={expandedSections.has("appearance")} onToggle={() => toggleSection("appearance")}>
          <Control label="Palette" value={options.paletteLinked ? undefined : "Custom colors"}><div className="palette-grid">{(Object.keys(PALETTES) as PaletteName[]).map(item => { const colors = paletteColors(item, options.theme); return <button key={item} type="button" className="palette-choice" aria-label={`${PALETTES[item].name} palette`} aria-pressed={options.paletteLinked && options.palette === item} onClick={() => choosePalette(item)}><span className="palette-chip" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${colors.color} 50%, ${colors.background} 50%)` }} /><span>{PALETTES[item].name}</span></button>; })}</div></Control>
          <div className="color-controls"><ColorControl label="Facet color" value={options.color} onChange={color => update({ color, paletteLinked: false })} /><ColorControl label="Background" value={options.background === "transparent" ? opaqueBackground : options.background} onChange={background => update({ background, paletteLinked: false })} /></div>
          <label className="control-check"><input type="checkbox" checked={options.background === "transparent"} onChange={() => update({ background: options.background === "transparent" ? options.paletteLinked ? paletteColors(options.palette, options.theme).background : opaqueBackground : "transparent" })} /><span>Transparent background</span></label>
        </Group>

        <Group id="position" title="Position" expanded={expandedSections.has("position")} onToggle={() => toggleSection("position")}>
          <Control label="Rotation" value={options.rotation ? "trackball" : options.yaw.toFixed(2)}><Slider min={-3.14} max={3.14} step={0.01} value={[options.yaw]} onValueChange={value => update({ yaw: sliderValue(value, 0), rotation: undefined })} /></Control>
          <Control label="Tilt" value={options.rotation ? "trackball" : options.pitch.toFixed(2)}><Slider min={-1.45} max={1.45} step={0.01} value={[options.pitch]} onValueChange={value => update({ pitch: sliderValue(value, 0), rotation: undefined })} /></Control>
          {options.rotation && <Button variant="ghost" size="sm" className="w-full" onClick={() => update({ rotation: undefined })}><RotateCcw className="size-3.5" /> Reset orientation</Button>}
          <Control label="Scale" value={options.zoom.toFixed(2)}><Slider min={0.5} max={1.5} step={0.01} value={[options.zoom]} onValueChange={value => update({ zoom: sliderValue(value, 1) })} /></Control>
        </Group>

        <Group id="animation" title="Animation" expanded={expandedSections.has("animation")} onToggle={() => toggleSection("animation")} headerAction={<button type="button" role="switch" aria-label="Animation" aria-checked={animationEnabled} className="animation-switch" onClick={toggleAnimation}><span /></button>}>
          <p className="control-hint">Subtle motion, independent of the shared design.</p>
          <Control label="Auto rotate" value={options.rotate.toFixed(2)}><Slider disabled={!animationEnabled} min={0} max={1} step={0.01} value={[options.rotate]} onValueChange={value => update({ rotate: sliderValue(value, 0) })} /></Control>
          <Control label="Float" value={options.float.toFixed(2)}><Slider disabled={!animationEnabled} min={0} max={1} step={0.01} value={[options.float]} onValueChange={value => update({ float: sliderValue(value, 0) })} /></Control>
        </Group>

        <Group id="share" title="Share & inspect" expanded={expandedSections.has("share")} onToggle={() => toggleSection("share")}>
          <Control label="Design code"><textarea aria-label="Design code" className="code-input" rows={3} spellCheck={false} value={draftCode} onChange={event => setDraftCode(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") applyCode(); }} /></Control>
          {codeError && <p role="alert" className="text-xs text-red-600">{codeError}</p>}
          <div className="flex gap-2"><Button variant="ghost" size="sm" className="flex-1" onClick={applyCode}>Load code</Button><Button variant="ghost" size="sm" className="flex-1" onClick={() => copyText("link", shareUrl.toString())}>{copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied === "link" ? "Copied" : "Copy link"}</Button></div>
          <div className="flex items-center justify-between gap-3"><div><label htmlFor="stats" className="text-xs font-medium">Renderer stats</label><p className="text-[11px] text-muted-foreground">Local display only; excluded from the code.</p></div><input id="stats" type="checkbox" className="size-4 accent-foreground" checked={stats} onChange={event => setStats(event.target.checked)} /></div>
        </Group>
        </div>
      </aside>

      <main className="preview-panel">
        <div className={`preview-toolbar ${lightScene ? "is-light-scene" : ""}`}>
          <h2 className="preview-toolbar-title truncate font-heading text-lg font-semibold tracking-tight">{poly.name}</h2>
          <div className="preview-toolbar-actions">
            <Button variant="ghost" size="sm" className="preview-share" aria-label={copied === "link" ? "Link copied" : "Share design"} onClick={() => copyText("link", shareUrl.toString())}>{copied === "link" ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}<span>{copied === "link" ? "Copied" : "Share"}</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="preview-export-trigger"><Download className="size-3.5" /> Export <ChevronDown className="size-3" /></DropdownMenuTrigger>
              <DropdownMenuContent aria-label="Export formats">
                <DropdownMenuItem onClick={downloadPng}><span className="export-menu-format"><FileImage className="size-3.5" /> PNG</span><span className="export-menu-caption">Current view</span></DropdownMenuItem>
                <DropdownMenuItem onClick={downloadGlb}><span className="export-menu-format"><Box className="size-3.5" /> GLB</span><span className="export-menu-caption">3D geometry</span></DropdownMenuItem>
                <DropdownMenuItem onClick={downloadGeometry}><span className="export-menu-format"><Braces className="size-3.5" /> JSON</span><span className="export-menu-caption">Exact topology</span></DropdownMenuItem>
                <p className="export-menu-note">Complex faces remain as edges in GLB.</p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="preview-toolbar-math" aria-label="Polyhedron geometry">
            <Suspense fallback={<span>V {poly.vertices.length} · E {poly.edges.length} · F {poly.faces.length} · χ {eulerCharacteristic(poly)}</span>}>
              <MathText tex={`V=${poly.vertices.length},\\; E=${poly.edges.length},\\; F=${poly.faces.length}`} />
              <MathText tex={`\\chi=V-E+F=${eulerCharacteristic(poly)}`} />
              {regularSymbol && <MathText className="preview-symbol" tex={regularSymbol} />}
            </Suspense>
          </div>
        </div>
        <div className="preview-surface">
          <noble-shape ref={hero} {...appearanceAttrs} background="transparent" stats={stats ? "true" : undefined} className="preview-model" />
        </div>
        <div className="preview-dock"><details className="embed-panel"><summary><span className="flex items-center gap-2"><Code2 className="size-4" /> Use this shape</span><span className="text-xs text-muted-foreground">Code examples</span></summary><div className="embed-content"><CodePreview formats={codeFormats} compact /></div></details></div>
      </main>
    </div>}
  </div>;
}
