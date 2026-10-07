"use client";

import dynamic from "next/dynamic";

const Workbench = dynamic(() => import("@/main").then(module => module.App), {
  ssr: false,
  loading: () => <main className="loading-page" aria-busy="true">Loading Noble Shapes…</main>,
});

export function ClientWorkbench() { return <Workbench />; }
