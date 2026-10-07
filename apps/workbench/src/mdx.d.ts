declare module "*.md" {
  import type { ComponentType } from "react";

  const Content: ComponentType<{ components?: Record<string, unknown> }>;
  export default Content;
}

declare module "virtual:documentation-source" {
  const source: string;
  export default source;
}
