import { memo, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// Map short codes to display labels
const LANGUAGE_MAP: Record<string, string> = {
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  go: "Go",
  rs: "Rust",
  rust: "Rust",
  java: "Java",
  cpp: "C++",
  c: "C",
  php: "PHP",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  xml: "XML",
  sql: "SQL",
  sh: "bash",
  bash: "bash",
  md: "Markdown",
  text: "text",
  txt: "text",
};

interface CodeBlockProps {
  code: string;
  language: string | null;
  highlightedHtml?: string;
}

const FOLD_THRESHOLD = 400;

export const CodeBlock = memo(
  ({ code, language, highlightedHtml }: CodeBlockProps) => {
    const fallback = `<pre class="shiki font-mono text-sm leading-relaxed whitespace-pre text-[var(--cuckoo-text-secondary)] bg-transparent! p-0 m-0 border-0"><code>${code}</code></pre>`;
    const html = highlightedHtml || fallback;

    const [copied, setCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [needsFolding, setNeedsFolding] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      if (contentRef.current) {
        const scrollHeight = contentRef.current.scrollHeight;
        if (scrollHeight > FOLD_THRESHOLD + 50) {
          setNeedsFolding(true);
          setContentHeight(scrollHeight);
        }
      }
    }, [html]);

    const displayLanguage = language
      ? LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase()
      : "text";

    const handleCopy = () => {
      setCopied(true);
      navigator.clipboard.writeText(code);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative group max-w-full my-6 not-prose">
        <div className="expressive-code relative rounded-xl border border-[var(--cuckoo-border)] bg-[var(--cuckoo-card-bg-hover)] overflow-hidden transition-colors shadow-sm">
          {/* Language Badge */}
          <div
            className={cn(
              "absolute z-10 right-2 top-2 px-2 py-0.5",
              "font-mono text-xs font-bold uppercase pointer-events-none transition-opacity duration-300",
              "text-[var(--cuckoo-primary)] bg-[var(--cuckoo-primary)]/10 rounded-lg",
              "group-hover:opacity-0",
            )}
          >
            {displayLanguage}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className={cn(
              "absolute z-20 right-2 top-2 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300",
              "bg-transparent border border-transparent text-gray-400 opacity-0 group-hover:opacity-100",
              "hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/20 hover:text-black dark:hover:text-white",
              copied && "text-green-500 hover:text-green-500 scale-110",
            )}
          >
            <div className="w-4 h-4 relative flex items-center justify-center">
              {copied ? (
                <Check
                  strokeWidth={2.5}
                  className="w-4 h-4 absolute animate-in zoom-in"
                />
              ) : (
                <Copy strokeWidth={2.5} className="w-4 h-4 absolute" />
              )}
            </div>
          </button>

          {/* Code Area */}
          <div
            className={cn(
              "relative overflow-hidden transition-[max-height] duration-500 ease-in-out",
            )}
            style={
              needsFolding
                ? { maxHeight: isCollapsed ? FOLD_THRESHOLD : contentHeight }
                : undefined
            }
          >
            <div
              ref={contentRef}
              className="text-sm font-mono leading-relaxed transition-opacity duration-300"
            >
              <div
                className="[&>pre]:px-5 [&>pre]:py-4 [&>pre]:m-0 [&>pre]:min-w-full [&>pre]:w-fit [&_code]:block [&_code]:w-fit [&>pre]:rounded-xl [&>pre>code]:p-0"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {needsFolding && (
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-10 transition-opacity duration-500",
                  "bg-gradient-to-t from-[var(--cuckoo-card-bg-hover)] to-transparent",
                  isCollapsed ? "opacity-100" : "opacity-0",
                )}
              />
            )}
          </div>

          {/* Expand Button */}
          {needsFolding && (
            <div
              className={cn(
                "absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none transition-all duration-500",
                isCollapsed
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4",
              )}
            >
              <button
                onClick={() => setIsCollapsed(false)}
                disabled={!isCollapsed}
                className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-[var(--cuckoo-card-bg)] hover:bg-[var(--cuckoo-card-bg-hover)] border border-[var(--cuckoo-border)] text-[var(--cuckoo-text-secondary)] hover:text-[var(--cuckoo-text-primary)] transition-all active:scale-[0.98] backdrop-blur-md"
              >
                <ChevronDown size={16} />
                <span>显示更多</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
