import { ClientWorkbench } from "../client-workbench";
import { pageSocial } from "../social";

export const metadata = pageSocial("documentation", "/documentation", "Documentation", "Use Noble Shapes with web components, Node, the CLI, and JavaScript.");
export default function Page() { return <ClientWorkbench />; }
