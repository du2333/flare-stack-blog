import { Check, ChevronDown, Copy } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
};

interface CodeBlockProps {
  code: string;
  language: string | null;
  highlightedHtml?: string;
}

const FOLD_THRESHOLD = 400;

/**
 * 代码块(对应原主题 Mac 风格窗口):
 * 深色背景 + 红黄绿三点窗口钮 + 复制按钮 + 长代码折叠。
 */
export const CodeBlock = memo(
  ({ code, language, highlightedHtml }: CodeBlockProps) => {
    const fallback = `<pre class="shiki font-mono text-sm leading-relaxed whitespace-pre text-[#abb2bf] bg-transparent! p-0 m-0 border-0"><code>${code}</code></pre>`;
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

    const normalizedLanguage = language?.toLowerCase();
    const displayLanguage = normalizedLanguage
      ? normalizedLanguage === "text" || normalizedLanguage === "txt"
        ? m.common_plain_text()
        : LANGUAGE_MAP[normalizedLanguage] || normalizedLanguage
      : m.common_plain_text();

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="group relative my-6 max-w-full not-prose">
        <div
          className="relative overflow-hidden rounded-[5px] pt-7"
          style={{
            backgroundColor: "#21252b",
            boxShadow: "0 10px 30px 0 rgb(0 0 0 / 20%)",
          }}
        >
          {/* Mac 窗口点(对应原主题 pre:before) */}
          <div className="absolute top-3.5 left-3.5 z-10 flex">
            <span
              className="cuckoo-code-dot"
              style={{ backgroundColor: "#fc625d" }}
            />
            <span
              className="cuckoo-code-dot -ml-2"
              style={{ backgroundColor: "#fdbc40" }}
            />
            <span
              className="cuckoo-code-dot -ml-2"
              style={{ backgroundColor: "#35cd4b" }}
            />
          </div>

          {/* 语言标签 */}
          <div className="pointer-events-none absolute top-2.5 left-16 z-10 font-mono text-xs text-[#7f848e] opacity-80">
            {displayLanguage}
          </div>

          {/* 复制按钮 */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={m.common_copy_code()}
            className={cn(
              "absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-md text-[#9da5b4] transition-all duration-300",
              "opacity-0 group-hover:opacity-100 hover:bg-white/10",
              copied && "text-green-400 opacity-100",
            )}
          >
            {copied ? (
              <Check strokeWidth={2.5} className="h-4 w-4 animate-in zoom-in" />
            ) : (
              <Copy strokeWidth={2.5} className="h-4 w-4" />
            )}
          </button>

          {/* 代码区(支持折叠) */}
          <div
            className={cn("cuckoo-code-folding-wrapper custom-scrollbar")}
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
                className="[&>pre]:mx-0 [&>pre]:mb-0 [&>pre]:min-w-full [&>pre]:w-fit [&>pre]:bg-transparent! [&>pre]:px-5 [&>pre]:pb-4 [&>pre]:pt-2 [&>pre]:shadow-none! [&>pre>code]:block [&>pre>code]:w-fit [&>pre>code]:p-0"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {needsFolding && (
              <div
                className={cn(
                  "cuckoo-code-mask transition-opacity duration-500",
                  isCollapsed ? "opacity-100" : "opacity-0",
                )}
              />
            )}
          </div>

          {/* 展开按钮 */}
          {needsFolding && (
            <div
              className={cn(
                "pointer-events-none absolute right-0 bottom-4 left-0 z-20 flex justify-center transition-all duration-500",
                isCollapsed
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0",
              )}
            >
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                disabled={!isCollapsed}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-[#c8ccd4] backdrop-blur-md transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                <ChevronDown size={16} />
                <span>{m.common_show_more()}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
