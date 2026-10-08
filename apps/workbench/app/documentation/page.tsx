import { SiteFrame } from "@/components/site-frame";
import { Documentation } from "@/views/documentation";
import { pageSocial } from "../social";

export const metadata = pageSocial("documentation", "/documentation", "Documentation", "Use Noble Shapes with web components, Node, the CLI, and JavaScript.");
export default function Page() { return <SiteFrame page="documentation"><Documentation /></SiteFrame>; }
