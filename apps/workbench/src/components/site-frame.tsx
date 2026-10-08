"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubStars } from "@/components/github-stars";
import { PRODUCT } from "@/lib/resources";

type Page = "showcase" | "research" | "documentation";
const links = [
  { href: "/3d", label: "Create 3D", page: "create" },
  { href: "/showcase", label: "Showcase", page: "showcase" },
  { href: "/research", label: "Research", page: "research" },
  { href: "/documentation", label: "Docs", page: "documentation" },
] as const;

export function SiteFrame({ page, children }: { page: Page; children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("noble-shapes-theme") ?? localStorage.getItem("noble-polyhedra-theme"); } catch { /* Storage may be disabled. */ }
    const next = saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("noble-shapes-theme", next); } catch { /* Storage may be disabled. */ }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== "d") return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      toggleTheme();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theme]);

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand-lockup"><a className="brand-product" href="/">{PRODUCT.name}</a><GitHubStars /></div>
      <nav className="app-nav" aria-label="Main navigation">{links.map(link => <a key={link.page} href={link.href}
        className={`app-nav-link ${page === link.page ? "is-active" : ""}`} aria-current={page === link.page ? "page" : undefined}>{link.label}</a>)}</nav>
      <div className="header-actions"><Button variant="ghost" size="icon" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title="Toggle theme (D)" onClick={toggleTheme}>{theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button></div>
    </header>
    {children}
  </div>;
}
