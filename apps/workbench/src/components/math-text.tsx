import katex from "katex";
import "katex/dist/katex.min.css";

/** Only pass formulas built from our fixed notation or validated geometry counts. */
export function MathText({ tex, className }: { tex: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: true, output: "htmlAndMathml" }) }} />;
}
