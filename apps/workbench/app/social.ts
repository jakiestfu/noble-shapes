import type { Metadata } from "next";
import product from "../../../product.config.json";
import type { PageCard } from "../src/server/og-card";

const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || product.url;

export function pageSocial(page: PageCard, path: string, title: string, description: string): Metadata {
  const image = `${origin}/og/${page}.png`;
  return {
    title,
    description,
    alternates: { canonical: `${origin}${path}` },
    openGraph: {
      type: "website", siteName: product.name, title: `${title} | ${product.name}`,
      description, url: `${origin}${path}`,
      images: [{ url: image, width: 1200, height: 630, alt: `${title} on ${product.name}` }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${product.name}`, description, images: [image] },
  };
}
