import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import scenes from "@/lib/showcase-scenes.json";

export const metadata: Metadata = { title: { absolute: "Noble Shapes" }, alternates: { canonical: "/" } };
export default function Page() { return <div className="app-shell is-home">
  <script dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.homeStart=String(Math.floor(Math.random()*${scenes.length}));` }} />
  <HomeHero />
</div>; }
