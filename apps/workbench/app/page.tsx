import type { Metadata } from "next";
import { ClientWorkbench } from "./client-workbench";

export const metadata: Metadata = { title: "Workbench" };
export default function Page() { return <ClientWorkbench />; }
