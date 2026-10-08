import { SiteFrame } from "@/components/site-frame";
import { Research } from "@/views/research";
import { pageSocial } from "../social";

export const metadata = pageSocial("research", "/research", "Research", "Explore the mathematics and classification of noble polyhedra.");
export default function Page() { return <SiteFrame page="research"><Research /></SiteFrame>; }
