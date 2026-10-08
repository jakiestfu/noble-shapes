import { useEffect, useRef, useState, type MouseEvent } from "react";
import { SHAPES, type ShapeId } from "@noble-shapes/core";
import { DEFAULT_DESIGN_OPTIONS } from "@noble-shapes/render";
import scenes from "@/lib/home-scenes.json";

type Destination = "create" | "showcase" | "research";
const destinations: { page: Destination; label: string; href: string }[] = [
  { page: "create", label: "Create 3D", href: "/3d" },
  { page: "showcase", label: "Showcase", href: "/showcase" },
  { page: "research", label: "Research", href: "/research" },
];

export function HomeHero({ onNavigate }: { onNavigate: (event: MouseEvent<HTMLAnchorElement>, page: Destination) => void }) {
  const [slide, setSlide] = useState<{ current: number; outgoing: number | null }>({ current: 0, outgoing: null });
  const [motionAllowed, setMotionAllowed] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const paused = useRef(false);
  const scene = scenes[slide.current]!;
  const outgoing = slide.outgoing === null ? null : scenes[slide.outgoing]!;
  const name = SHAPES.find(item => item.id === scene.shape)?.name ?? scene.shape;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionAllowed(!preference.matches);
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    if (!motionAllowed) return;
    for (const item of scenes) {
      const image = new Image();
      image.src = `/home/${item.shape}.png`;
    }
    const timer = window.setInterval(() => {
      if (!document.hidden && !paused.current) setSlide(previous => ({
        current: (previous.current + 1) % scenes.length,
        outgoing: previous.current,
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [motionAllowed]);

  return <main className="home-hero">
    <div className="home-model" onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}>
      <noble-shape shape={scene.shape as ShapeId} view={DEFAULT_DESIGN_OPTIONS.view} material={DEFAULT_DESIGN_OPTIONS.material}
        color={DEFAULT_DESIGN_OPTIONS.color} background="transparent" yaw={String(scene.yaw)} pitch={String(scene.pitch)}
        rotate={motionAllowed ? "0.25" : undefined} float={motionAllowed ? "0.25" : undefined}
        aria-label={name} />
      {outgoing && <img key={outgoing.shape} className="home-model-outgoing" src={`/home/${outgoing.shape}.png`} alt="" aria-hidden="true" />}
    </div>
    <div className="home-content">
      <p className="home-shape-name">{name}</p><h1>Noble Shapes</h1>
      <p className="home-kicker">146 finite forms · two infinite families</p>
      <nav className="home-tabs" aria-label="Explore Noble Shapes">{destinations.map(item =>
        <a key={item.page} href={item.href} onClick={event => onNavigate(event, item.page)}>{item.label}</a>)}</nav>
    </div>
  </main>;
}
