import { ClientWorkbench } from "../client-workbench";
import { pageSocial } from "../social";

export const metadata = pageSocial("create", "/create", "Create", "Choose a noble polyhedron, tune its appearance, and share your design.");
export default function Page() { return <ClientWorkbench />; }
