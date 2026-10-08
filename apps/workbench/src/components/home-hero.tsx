"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { SHAPES, type ShapeId } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS, PALETTES, type PaletteName } from "@noble-shapes/render";
import type { NobleShapeElement } from "@noble-shapes/web-component";
import { GitHubStars } from "@/components/github-stars";
import scenes from "@/lib/home-scenes.json";

type Destination = "create" | "showcase" | "research";
type Slide = { current: number; outgoing: number | null };
type HomeScene = (typeof scenes)[number];
const CYCLE_MS = 4000;
const FADE_MS = 1200;
const THEME_STORAGE_KEY = "noble-shapes-theme";
const destinations: { page: Destination; label: string; href: string }[] = [
  { page: "create", label: "Create 3D", href: "/3d" },
  { page: "showcase", label: "Showcase", href: "/showcase" },
  { page: "research", label: "Research", href: "/research" },
];

function sceneStyle(index: number): CSSProperties {
  const colors = PALETTES[scenes[index]!.palette as PaletteName];
  return { "--home-color": colors.color, "--home-background": colors.background } as CSSProperties;
}

function HomeShape({ scene, motionAllowed, name }: { scene: HomeScene; motionAllowed: boolean; name: string }) {
  const element = useRef<NobleShapeElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const shape = element.current;
    if (!shape) return;
    const onRender = () => setReady(true);
    shape.addEventListener("noble-render", onRender);
    return () => shape.removeEventListener("noble-render", onRender);
  }, []);

  const colors = PALETTES[scene.palette as PaletteName];
  return <>
    <img className={`home-model-poster ${ready ? "is-hidden" : ""}`} src={`/home/${scene.shape}.png`} alt=""
      width="720" height="720" decoding="async" fetchPriority="high" />
    <noble-shape ref={element} className={ready ? "is-ready" : ""} shape={scene.shape as ShapeId}
      view={DEFAULT_DESIGN_OPTIONS.view} material={DEFAULT_DESIGN_OPTIONS.material}
      color={colors.color} background="transparent" yaw={String(scene.yaw)} pitch={String(scene.pitch)}
      rotate={motionAllowed ? "0.65" : undefined} aria-label={name} />
  </>;
}

export function HomeHero({ onNavigate, theme, onToggleTheme }: {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, page: Destination) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}) {
  const [slide, setSlide] = useState<Slide>({ current: 0, outgoing: null });
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [localTheme, setLocalTheme] = useState<"light" | "dark">("dark");
  const paused = useRef(false);
  const visible = slide.outgoing === null ? [slide.current] : [slide.outgoing, slide.current];
  const activeTheme = theme ?? localTheme;

  useEffect(() => {
    // Keep links shared before the /3d route existed working.
    const legacyCode = new URLSearchParams(window.location.search).get("code");
    if (legacyCode) {
      window.location.replace(`/3d?code=${encodeURIComponent(legacyCode)}`);
      return;
    }
    // Static HTML starts with a prepared image; choose a random featured shape after hydration.
    const first = Math.floor(Math.random() * scenes.length);
    if (first !== 0) setSlide({ current: first, outgoing: 0 });
    void import("@noble-shapes/web-component");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionAllowed(!preference.matches);
    onChange();
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (theme) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem("noble-polyhedra-theme"); } catch { /* Storage may be disabled. */ }
    const next = saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setLocalTheme(next);
    document.documentElement.dataset.theme = next;
  }, [theme]);

  const toggleTheme = () => {
    if (onToggleTheme) { onToggleTheme(); return; }
    const next = activeTheme === "light" ? "dark" : "light";
    setLocalTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Storage may be disabled. */ }
  };

  useEffect(() => {
    if (onToggleTheme) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== "d") return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      toggleTheme();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTheme, onToggleTheme]);

  useEffect(() => {
    if (!motionAllowed) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !paused.current) {
        setSlide(previous => ({ current: (previous.current + 1) % scenes.length, outgoing: previous.current }));
      }
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [motionAllowed]);

  useEffect(() => {
    if (slide.outgoing === null) return;
    const timer = window.setTimeout(() => setSlide(previous => ({ ...previous, outgoing: null })), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [slide.outgoing]);

  return <main className="home-hero">
    <div className="home-backgrounds" aria-hidden="true">{visible.slice().reverse().map(index =>
      <div key={scenes[index]!.shape} className={`home-background-layer ${index === slide.outgoing ? "is-leaving" : ""}`} style={sceneStyle(index)} />
    )}</div>
    <button type="button" className="home-theme-toggle" aria-label={`Switch to ${activeTheme === "light" ? "dark" : "light"} mode`}
      title="Toggle theme (D)" onClick={toggleTheme}>{activeTheme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button>
    <div className="home-model" onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}>
      {visible.map(index => {
        const scene = scenes[index]!;
        const name = SHAPES.find(item => item.id === scene.shape)?.name ?? scene.shape;
        return <div key={scene.shape} className={`home-model-layer ${index === slide.outgoing ? "is-leaving" : slide.outgoing !== null ? "is-entering" : ""}`}
          aria-hidden={index === slide.outgoing}>
          <HomeShape scene={scene} motionAllowed={motionAllowed} name={name} />
        </div>;
      })}
    </div>
    <div className="home-content">
      <div className="home-shape-name-slot">{visible.map(index => {
        const scene = scenes[index]!;
        const name = SHAPES.find(item => item.id === scene.shape)?.name ?? scene.shape;
        return <p key={scene.shape} aria-hidden={index === slide.outgoing} className={`home-shape-name ${index === slide.outgoing ? "is-leaving" : slide.outgoing !== null ? "is-entering" : ""}`}>{name}</p>;
      })}</div>
      <h1>Noble Shapes</h1>
      <p className="home-tagline">A playground for exploring finite and infinite noble polyhedra.</p>
      <nav className="home-tabs" aria-label="Explore Noble Shapes">{destinations.map(item =>
        <a key={item.page} href={item.href} onClick={onNavigate ? event => onNavigate(event, item.page) : undefined}>{item.label}</a>)}</nav>
      <div className="home-github"><GitHubStars /></div>
    </div>
  </main>;
}
