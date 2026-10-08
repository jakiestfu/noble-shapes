import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { SHAPES, type ShapeId } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS, PALETTES, type PaletteName } from "@noble-shapes/render";
import scenes from "@/lib/home-scenes.json";

type Destination = "create" | "showcase" | "research";
type Slide = { current: number; outgoing: number | null };
const CYCLE_MS = 6000;
const FADE_MS = 1200;
const destinations: { page: Destination; label: string; href: string }[] = [
  { page: "create", label: "Create 3D", href: "/3d" },
  { page: "showcase", label: "Showcase", href: "/showcase" },
  { page: "research", label: "Research", href: "/research" },
];

function sceneStyle(index: number): CSSProperties {
  const colors = PALETTES[scenes[index]!.palette as PaletteName];
  return { "--home-color": colors.color, "--home-background": colors.background } as CSSProperties;
}

export function HomeHero({ onNavigate }: { onNavigate: (event: MouseEvent<HTMLAnchorElement>, page: Destination) => void }) {
  const [slide, setSlide] = useState<Slide>({ current: 0, outgoing: null });
  const [motionAllowed, setMotionAllowed] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const paused = useRef(false);
  const visible = slide.outgoing === null ? [slide.current] : [slide.outgoing, slide.current];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionAllowed(!preference.matches);
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

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
    <div className="home-model" onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}>
      {visible.map(index => {
        const scene = scenes[index]!;
        const colors = PALETTES[scene.palette as PaletteName];
        const name = SHAPES.find(item => item.id === scene.shape)?.name ?? scene.shape;
        return <noble-shape key={scene.shape} className={`home-model-layer ${index === slide.outgoing ? "is-leaving" : slide.outgoing !== null ? "is-entering" : ""}`}
          shape={scene.shape as ShapeId} view={DEFAULT_DESIGN_OPTIONS.view} material={DEFAULT_DESIGN_OPTIONS.material}
          color={colors.color} background="transparent" yaw={String(scene.yaw)} pitch={String(scene.pitch)}
          rotate={motionAllowed ? "0.15" : undefined} float={motionAllowed ? "0.15" : undefined}
          aria-label={name} aria-hidden={index === slide.outgoing} />;
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
        <a key={item.page} href={item.href} onClick={event => onNavigate(event, item.page)}>{item.label}</a>)}</nav>
    </div>
  </main>;
}
