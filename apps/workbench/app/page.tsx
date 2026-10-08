import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";

export const metadata: Metadata = { title: { absolute: "Noble Shapes" }, alternates: { canonical: "/" } };
export default function Page() { return <div className="app-shell is-home"><HomeHero /></div>; }
