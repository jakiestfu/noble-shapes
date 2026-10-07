import { ClientWorkbench } from "../client-workbench";
import { pageSocial } from "../social";

export const metadata = pageSocial("research", "/research", "Research", "Explore the mathematics and classification of noble polyhedra.");
export default function Page() { return <ClientWorkbench />; }
