"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Content from "../../.generated/DOCUMENTATION.mdx";
import Catalogue from "../../.generated/CATALOGUE.mdx";
import source from "../../.generated/source";
import { CodePreview, MdxCodeBlock, type CodeFormat, type PreviewScene } from "@/components/code-preview";
import { CODE_EXAMPLES, type CodeExampleId } from "@/lib/code-examples";

type Heading = { id: string; label: string; level: 2 | 3 };

const headings: Heading[] = [...source.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(([, marks, label]) => ({
  id: label!.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"),
  label: label!,
  level: marks!.length as 2 | 3,
}));

function Callout({ children }: { children?: ReactNode }) {
  return <aside className="docs-callout">{children}</aside>;
}

function MdxCodeExample({ example, formats, preview }: { example?: CodeExampleId; formats?: CodeFormat[]; preview?: PreviewScene }) {
  const definition = example ? CODE_EXAMPLES[example] : undefined;
  return <CodePreview formats={formats ?? definition?.formats} preview={preview ?? definition?.preview} />;
}

export function Documentation() {
  const scroller = useRef<HTMLElement>(null);
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const page = scroller.current;
    if (!page) return;
    const syncActive = () => {
      const offset = window.matchMedia("(max-width: 850px)").matches ? 115 : page.getBoundingClientRect().top + 115;
      const visible = headings.filter(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= offset);
      setActive(visible.at(-1)?.id ?? headings[0]?.id ?? "");
    };
    page.addEventListener("scroll", syncActive, { passive: true });
    window.addEventListener("scroll", syncActive, { passive: true });
    if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
    syncActive();
    return () => { page.removeEventListener("scroll", syncActive); window.removeEventListener("scroll", syncActive); };
  }, []);

  return <main ref={scroller} className="content-page docs-page"><div className="docs-layout">
    <aside className="docs-sidebar" aria-label="Documentation contents"><p className="docs-sidebar-title">On this page</p><nav className="docs-nav" aria-label="Documentation sections">{headings.map(heading => <a key={heading.id} href={`#${heading.id}`} data-level={heading.level} className={`docs-nav-link ${active === heading.id ? "is-active" : ""}`} aria-current={active === heading.id ? "location" : undefined} onClick={() => setActive(heading.id)}>{heading.label}</a>)}</nav></aside>
    <article className="docs-article prose prose-neutral docs-prose"><Content components={{ Callout, CodePreview: MdxCodeExample, pre: MdxCodeBlock }} /><Catalogue components={{ CodePreview: MdxCodeExample, pre: MdxCodeBlock }} /></article>
  </div></main>;
}
