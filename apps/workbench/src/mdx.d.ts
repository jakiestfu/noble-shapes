declare module "*.mdx" {
  import type { ComponentType } from "react";

  const Content: ComponentType<{ components?: Record<string, unknown> }>;
  export default Content;
}
