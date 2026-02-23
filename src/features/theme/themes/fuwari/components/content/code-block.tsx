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
  sh: "sh",
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
    const fallback = `<pre class="shiki font-mono text-sm leading-relaxed whitespace-pre text-(--fuwari-btn-content) bg-transparent! p-0 m-0 border-0"><code>${code}</code></pre>`;
    const html = highlightedHtml || fallback;

    const [copied, setCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [needsFolding, setNeedsFolding] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      if (contentRef.current) {
        // If the content is taller than our threshold, enable folding
        const scrollHeight = contentRef.current.scrollHeight;
        if (scrollHeight > FOLD_THRESHOLD + 50) {
          setNeedsFolding(true);
          setContentHeight(scrollHeight);
        }
      }
    }, [html]);

    // Helper to get display label (following expressive-code language badge logic)
    const displayLanguage = language
      ? LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase()
      : "text";

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative group max-w-full my-6 not-prose">
        <div className="expressive-code relative rounded-xl border border-black/10 dark:border-white/10 bg-(--fuwari-code-bg) overflow-hidden transition-colors shadow-sm">
          {/* Language Badge */}
          <div
            className={cn(
              "absolute z-10 right-2 top-2 px-2 py-0.5",
              "font-mono text-xs font-bold uppercase pointer-events-none transition-opacity duration-300",
              "text-(--fuwari-primary) bg-(--fuwari-primary)/10 rounded-lg",
              "group-hover:opacity-0",
            )}
          >
            {displayLanguage}
          </div>

          {/* Custom Copy Button (Expressive Code Style) */}
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className={cn(
              "absolute z-20 right-2 top-2 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300",
              "bg-transparent border border-transparent text-gray-400 opacity-0 group-hover:opacity-100",
              "hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/20 hover:text-black dark:hover:text-white",
              copied && "text-green-500 hover:text-green-500 scale-110", // success state overrides
            )}
          >
            <div className="w-4 h-4 relative flex items-center justify-center">
              {copied ? (
                /* Success Check Icon */
                <Check
                  strokeWidth={2.5}
                  className="w-4 h-4 absolute animate-in zoom-in"
                />
              ) : (
                /* Copy Icon */
                <Copy strokeWidth={2.5} className="w-4 h-4 absolute" />
              )}
            </div>
          </button>

          {/* Code Area with Folding Support */}
          <div
            className={cn("fuwari-code-folding-wrapper custom-scrollbar")}
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
                  "fuwari-code-mask transition-opacity duration-500",
                  isCollapsed ? "opacity-100" : "opacity-0",
                )}
              />
            )}
          </div>

          {/* Expand Button (Subtle Overlay Style) */}
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
                className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-all active:scale-[0.98] backdrop-blur-md"
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
