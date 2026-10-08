"use client";

import dynamic from "next/dynamic";
import { CreateFallback } from "./create-fallback";

const Workbench = dynamic(() => import("@/main").then(module => module.App), {
  ssr: false,
  loading: () => <CreateFallback />,
});

export function ClientWorkbench() { return <Workbench />; }
