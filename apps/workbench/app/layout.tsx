import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import product from "../../../product.config.json";
import "../src/style.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || product.url;
const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
if (googleAnalyticsId && !/^G-[A-Z0-9]+$/.test(googleAnalyticsId)) {
  throw new Error("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID must be a GA4 measurement ID such as G-ABC123");
}
const description = "A playground for exploring finite and infinite noble polyhedra.";
const defaultImage = `${siteUrl}/og/default.png`;
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: product.name, template: `%s | ${product.name}` },
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
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  </head><body>{children}</body>
    {googleAnalyticsId && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', ${JSON.stringify(googleAnalyticsId)});
      `}</Script>
    </>}
  </html>;
}
