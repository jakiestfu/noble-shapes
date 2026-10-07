import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { ShapeId } from "@noble-shapes/core";
import type { MaterialName, PaletteName, RenderView } from "@noble-shapes/render";
import type { NoblePolyhedronElement } from "./index.js";

type NoblePolyhedronProps = Omit<DetailedHTMLProps<HTMLAttributes<NoblePolyhedronElement>, NoblePolyhedronElement>, "color"> & {
  shape?: ShapeId | "random";
  seed?: string | number;
  random?: string | boolean;
  view?: RenderView;
  material?: MaterialName;
  palette?: PaletteName;
  color?: string;
  background?: string;
  yaw?: string | number;
  pitch?: string | number;
  rotation?: string;
  zoom?: string | number;
  "face-index"?: string | number;
  stats?: string | boolean;
  rotate?: string | number;
  float?: string | number;
  n?: string | number;
  p?: string | number;
  q?: string | number;
  "crown-height"?: string | number;
  a?: string | number;
  b?: string | number;
  c?: string | number;
  oninput?: (event: Event) => void;
  onchange?: (event: Event) => void;
  "onnoble-render"?: (event: CustomEvent<Record<string, unknown>>) => void;
  "onnoble-error"?: (event: CustomEvent<unknown>) => void;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "noble-shape": NoblePolyhedronProps;
      "noble-polyhedron": NoblePolyhedronProps;
    }
  }
}

export {};
