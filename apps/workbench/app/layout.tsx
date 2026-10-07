import type { Metadata } from "next";
import type { ReactNode } from "react";
import product from "../../../product.config.json";
import "../src/style.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || product.url;
const description = "Explore, customize, and render 146 noble polyhedra and two infinite families.";
const defaultImage = `${siteUrl}/api/image/default`;
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: product.name, template: `%s — ${product.name}` },
  description,
  openGraph: {
    type: "website", siteName: product.name, title: product.name, description, url: siteUrl,
    images: [{ url: defaultImage, width: 1200, height: 630, alt: "A noble polyhedron rendered by Noble Shapes" }],
  },
  twitter: { card: "summary_large_image", title: product.name, description, images: [defaultImage] },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head><body>{children}</body></html>;
}
