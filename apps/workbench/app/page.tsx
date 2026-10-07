import type { Metadata } from "next";
import { ClientWorkbench } from "./client-workbench";

export const metadata: Metadata = { title: { absolute: "Noble Shapes" }, alternates: { canonical: "/" } };
export default function Page() { return <ClientWorkbench />; }
