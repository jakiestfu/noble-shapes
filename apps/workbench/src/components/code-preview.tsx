import { createElement, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Eye } from "lucide-react";
import { renderScene, type SceneOptions } from "@noble-polyhedra/render";
import { Toggle, ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Token = { text: string; kind?: "keyword" | "string" | "comment" | "number" | "tag" | "attribute" | "punctuation" };
export type CodeFormat = { id: string; label: string; language: string; code: string };
export type PreviewScene =
  | { kind: "component"; attributes: Record<string, string>; background: string; caption: string }
  | { kind: "raster"; options: SceneOptions; caption: string };
export type CodeExample = { formats: CodeFormat[]; preview: PreviewScene };

const SCRIPT = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|const|let|var|new|return|await|async|function|if|else|type|interface|class|extends|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[{}()[\].,;:=<>+\-*/!?&|]/g;
const MARKUP = /<!--[\s\S]*?-->|<\/?[\w-]+|\/?>|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\w:-]+(?==)|[{}=]/g;
const JSX = new RegExp(`${MARKUP.source}|${SCRIPT.source}`, "g");
const SHELL = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--[\w-]+|\b(?:npm|pnpm|npx|node)\b|\b\d+(?:\.\d+)?\b/g;

function tokenize(source: string, language: string): Token[] {
  const markup = ["html", "xml", "vue"].includes(language);
  const jsx = ["jsx", "tsx"].includes(language);
  const pattern = markup ? MARKUP : jsx ? JSX : ["sh", "bash", "shell"].includes(language) ? SHELL : SCRIPT;
  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ text: source.slice(cursor, index) });
    const text = match[0];
    let kind: Token["kind"];
    if (text.startsWith("//") || text.startsWith("/*") || text.startsWith("<!--") || (["sh", "bash", "shell"].includes(language) && text.startsWith("#"))) kind = "comment";
    else if (/^["'`]/.test(text)) kind = "string";
    else if (/^\d/.test(text)) kind = "number";
    else if (text.startsWith("<") && /[\w]/.test(text)) kind = "tag";
    else if ((markup || jsx) && /^[\w:-]+$/.test(text) && source[index + text.length] === "=") kind = "attribute";
    else if (/^[{}()[\].,;:=<>+\-*/!?&|]+$/.test(text) || text === "/>") kind = "punctuation";
    else kind = "keyword";
    tokens.push({ text, kind });
    cursor = index + text.length;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor) });
  return tokens;
}

function RasterPreview({ options }: { options: SceneOptions }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!canvas.current || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setVisible(true); }, { rootMargin: "200px" });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      try {
        const image = renderScene({ ...options, width: 320, height: 320 });
        if (!canvas.current) return;
        canvas.current.width = image.width;
        canvas.current.height = image.height;
        canvas.current.getContext("2d")?.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
      } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    });
    return () => cancelAnimationFrame(frame);
  }, [options, visible]);
  return error ? <p role="status" className="code-preview-error">{error}</p> : <canvas ref={canvas} aria-label="Rendered polyhedron image" />;
}

function PreviewPane({ scene }: { scene: PreviewScene }) {
  return <div className={`code-preview-visual ${scene.kind === "raster" && scene.options.background === "transparent" ? "is-transparent" : ""}`} style={scene.kind === "component" ? { background: scene.background } : undefined}>
    {scene.kind === "component"
      ? createElement("noble-polyhedron", { ...scene.attributes, style: { width: "100%", height: "100%" }, "aria-label": "Interactive polyhedron preview" })
      : <RasterPreview options={scene.options} />}
    <span className="code-preview-caption">{scene.caption}</span>
  </div>;
}

export function CodePreview({ code = "", language = "ts", formats, preview, compact = false }: { code?: string; language?: string; formats?: CodeFormat[]; preview?: PreviewScene; compact?: boolean }) {
  const choices = formats?.length ? formats : [{ id: language, label: language === "sh" ? "Terminal" : language.toUpperCase(), language, code }];
  const [selectedId, setSelectedId] = useState(choices[0]!.id);
  const [showPreview, setShowPreview] = useState(Boolean(preview));
  const [copied, setCopied] = useState(false);
  const selected = choices.find(item => item.id === selectedId) ?? choices[0]!;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard access is optional. */ }
  };
  return <div className={`code-preview ${compact ? "is-compact" : ""} ${showPreview && preview ? "has-preview" : ""}`}>
    <div className="code-preview-bar" role="toolbar" aria-label="Code example controls">
      <ToggleGroup className="code-format-group" value={[selected.id]} onValueChange={values => { if (values[0]) { setSelectedId(values[0]); setCopied(false); } }} aria-label="Code format">
        {choices.map(item => <ToggleGroupItem key={item.id} value={item.id} aria-label={`${item.label} code`}>{item.label}</ToggleGroupItem>)}
      </ToggleGroup>
      <div className="code-preview-actions">
        {preview && <Toggle value="preview" pressed={showPreview} onPressedChange={setShowPreview} aria-label={showPreview ? "Hide preview" : "Show preview"}><Eye size={13} /> Preview</Toggle>}
        <button type="button" aria-label={copied ? "Copied code" : "Copy code"} onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>
      </div>
    </div>
    <div className="code-preview-body">
      <pre aria-label={`${selected.label} source code`}><code>{tokenize(selected.code.trimEnd(), selected.language).map((token, index) => token.kind ? <span key={index} className={`syntax-${token.kind}`}>{token.text}</span> : token.text)}</code></pre>
      {showPreview && preview && <PreviewPane scene={preview} />}
    </div>
  </div>;
}

export function MdxCodeBlock({ children }: { children?: ReactNode }) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>;
  const language = children.props.className?.match(/language-([\w-]+)/)?.[1] ?? "text";
  return <CodePreview code={String(children.props.children ?? "")} language={language} />;
}
