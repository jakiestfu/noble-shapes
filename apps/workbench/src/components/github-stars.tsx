"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { PROJECT_GITHUB_URL } from "@/lib/resources";

export function GitHubStars() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!PROJECT_GITHUB_URL) return;
    const controller = new AbortController();
    const repository = new URL(PROJECT_GITHUB_URL).pathname.replace(/^\/+|\/+$/g, "");
    fetch(`https://api.github.com/repos/${repository}`, { signal: controller.signal, headers: { Accept: "application/vnd.github+json" } })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (typeof data?.stargazers_count === "number") setCount(data.stargazers_count); })
      .catch(() => { /* The repository link remains usable when the count is unavailable. */ });
    return () => controller.abort();
  }, []);

  if (!PROJECT_GITHUB_URL) return null;
  return <a className="github-stars" href={PROJECT_GITHUB_URL} target="_blank" rel="noopener noreferrer"
    aria-label={count === null ? "Star Noble Shapes on GitHub" : `Noble Shapes on GitHub · ${count.toLocaleString()} stars`} title="Star on GitHub">
    <Star aria-hidden="true" className="size-3.5" /><span className="github-stars-label">GitHub</span>{count !== null && <span className="github-stars-count">{count.toLocaleString()}</span>}
  </a>;
}
