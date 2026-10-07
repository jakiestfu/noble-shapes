import { isValidElement, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

type Token = { text: string; kind?: "keyword" | "string" | "comment" | "number" | "tag" | "attribute" | "punctuation" };

const SCRIPT = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|const|let|var|new|return|await|async|function|if|else|type|interface|class|extends|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[{}()[\].,;:=<>+\-*/!?&|]/g;
const MARKUP = /<!--[\s\S]*?-->|<\/?[\w-]+|\/?>|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\w:-]+(?==)|[{}=]/g;
const SHELL = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--[\w-]+|\b(?:npm|pnpm|npx|node)\b|\b\d+(?:\.\d+)?\b/g;

function tokenize(source: string, language: string): Token[] {
  const pattern = language === "html" || language === "xml" ? MARKUP : language === "sh" || language === "bash" || language === "shell" ? SHELL : SCRIPT;
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
    else if ((language === "html" || language === "xml") && /^[\w:-]+$/.test(text) && source[index + text.length] === "=") kind = "attribute";
    else if (/^[{}()[\].,;:=<>+\-*/!?&|]+$/.test(text) || text === "/>") kind = "punctuation";
    else kind = "keyword";
    tokens.push({ text, kind });
    cursor = index + text.length;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor) });
  return tokens;
}

export function CodePreview({ code, language = "ts", compact = false }: { code: string; language?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard access is optional. */ }
  };
  return <div className={`code-preview ${compact ? "is-compact" : ""}`}>
    <div className="code-preview-bar"><span>{language === "sh" ? "terminal" : language}</span><button type="button" aria-label={copied ? "Copied code" : "Copy code"} onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div>
    <pre><code>{tokenize(code.trimEnd(), language).map((token, index) => token.kind ? <span key={index} className={`syntax-${token.kind}`}>{token.text}</span> : token.text)}</code></pre>
  </div>;
}

export function MdxCodeBlock({ children }: { children?: ReactNode }) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>;
  const language = children.props.className?.match(/language-([\w-]+)/)?.[1] ?? "text";
  return <CodePreview code={String(children.props.children ?? "")} language={language} />;
}
