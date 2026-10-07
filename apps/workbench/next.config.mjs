import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  agentRules: false,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  transpilePackages: ["noble-shapes", "@noble-shapes/core", "@noble-shapes/render", "@noble-shapes/web-component"],
  devIndicators: false,
};

export default createMDX({ extension: /\.mdx$/, options: { rehypePlugins: ["rehype-slug"] } })(config);
