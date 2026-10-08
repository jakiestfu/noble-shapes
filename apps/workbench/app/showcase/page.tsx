import { SiteFrame } from "@/components/site-frame";
import { Showcase } from "@/views/showcase";
import { pageSocial } from "../social";

export const metadata = pageSocial("showcase", "/showcase", "Showcase", "Explore notable noble polyhedra, from regular stars to new facetings.");
export default function Page() { return <SiteFrame page="showcase"><Showcase /></SiteFrame>; }
