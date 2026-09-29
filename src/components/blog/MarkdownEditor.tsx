import { useRef, useState } from "react";
import { Bold, Italic, Link as LinkIcon, Heading2, List, Code, Quote, Eye, EyeOff } from "lucide-react";
import { Markdown } from "./Markdown";

type Props = {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
};

type Insertion = { before: string; after: string; placeholder?: string };

const WRAPS: Record<string, Insertion> = {
  bold: { before: "**", after: "**", placeholder: "texto" },
  italic: { before: "_", after: "_", placeholder: "texto" },
  code: { before: "`", after: "`", placeholder: "código" },
  link: { before: "[", after: "](https://)", placeholder: "texto do link" },
};

const LINE_PREFIX: Record<string, string> = {
  h2: "## ",
  quote: "> ",
  list: "- ",
};

export function MarkdownEditor({ value, onChange, rows = 20, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  function wrap(kind: keyof typeof WRAPS) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const { before, after, placeholder: ph } = WRAPS[kind];
    const selected = value.slice(start, end) || ph || "";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length;
      ta.setSelectionRange(pos, pos + selected.length);
    });
  }

  function prefixLine(kind: keyof typeof LINE_PREFIX) {
    const ta = ref.current;
    if (!ta) return;
    const prefix = LINE_PREFIX[kind];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEnd = value.indexOf("\n", end);
    const endIdx = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(lineStart, endIdx);
    const prefixed = block
      .split("\n")
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(endIdx);
    onChange(next);
    requestAnimationFrame(() => ta.focus());
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-bg-elevated">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-bg-surface-1 px-2 py-1.5">
        <ToolbarBtn title="Negrito (Ctrl+B)" onClick={() => wrap("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Itálico (Ctrl+I)" onClick={() => wrap("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Título H2" onClick={() => prefixLine("h2")}>
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Lista" onClick={() => prefixLine("list")}>
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Citação" onClick={() => prefixLine("quote")}>
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Código inline" onClick={() => wrap("code")}>
          <Code className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Link" onClick={() => wrap("link")}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarBtn>
        <div className="ml-auto">
          <ToolbarBtn
            title={showPreview ? "Ocultar preview" : "Mostrar preview"}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </ToolbarBtn>
        </div>
      </div>
      <div className={`grid ${showPreview ? "md:grid-cols-2" : ""}`}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
              e.preventDefault();
              wrap("bold");
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
              e.preventDefault();
              wrap("italic");
            }
          }}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-y border-0 bg-bg-elevated p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        {showPreview && (
          <div className="border-t border-border p-3 md:border-l md:border-t-0">
            {value ? (
              <Markdown>{value}</Markdown>
            ) : (
              <p className="text-sm text-text-tertiary">Preview aparecerá aqui conforme você escreve.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
    >
      {children}
    </button>
  );
}
