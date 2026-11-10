import { ChevronDown } from "lucide-react";
import { memo, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { ShikiHtml } from "@/components/content/shiki-html";
import { CodeCopyButton } from "@/components/ui/copy-button";
import { isPlainTextLanguage, resolveCodeLanguage } from "@/lib/code-languages";
import { escapeCodeHtml } from "@/lib/plain-code-html";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface CodeBlockProps {
  code: string;
  language: string | null;
  highlightedHtml?: string;
}

const FOLD_THRESHOLD = 400;

export const CodeBlock = memo(
  ({ code, language, highlightedHtml }: CodeBlockProps) => {
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
    }, [code, highlightedHtml]);

    return (
      <CodeBlockFrame code={code} language={language}>
        {/* Code Area with Folding Support */}
        <div
          className={cn("fuwari-code-folding-wrapper custom-scrollbar")}
          style={
            needsFolding
              ? { maxHeight: isCollapsed ? FOLD_THRESHOLD : contentHeight }
              : undefined
          }
        >
          <div ref={contentRef}>
            <CodeHtml code={code} highlightedHtml={highlightedHtml} />
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
              <span>{m.common_show_more()}</span>
            </button>
          </div>
        )}
      </CodeBlockFrame>
    );
  },
);

/**
 * The published code: snapshot Shiki HTML, or the escaped source when the
 * block has none.
 */
export function CodeHtml({
  code,
  highlightedHtml,
}: {
  code: string;
  highlightedHtml?: string;
}) {
  const html =
    highlightedHtml ||
    `<pre class="shiki font-mono text-sm leading-relaxed whitespace-pre text-(--fuwari-btn-content) bg-transparent! p-0 m-0 border-0"><code>${escapeCodeHtml(code)}</code></pre>`;

  return (
    <div className="text-sm font-mono leading-relaxed transition-opacity duration-300">
      <ShikiHtml html={html} />
    </div>
  );
}

/**
 * The code block chrome shared by plain code and Mermaid diagrams: card,
 * language badge and a copy button that copies the source.
 */
export function CodeBlockFrame({
  code,
  language,
  children,
}: {
  code: string;
  language: string | null;
  children: ReactNode;
}) {
  // Helper to get display label (following expressive-code language badge logic)
  const displayLanguage = isPlainTextLanguage(language)
    ? m.common_plain_text()
    : (resolveCodeLanguage(language)?.label ?? language?.toLowerCase());

  return (
    <div className="relative group max-w-full my-6 not-prose">
      <div className="expressive-code relative rounded-xl border border-(--theme-rule,var(--fuwari-input-border)) bg-(--theme-raised) overflow-hidden transition-colors shadow-sm">
        {/* Language Badge */}
        <div
          className={cn(
            "absolute z-10 right-2 top-2 px-2 py-0.5",
            "font-mono text-xs font-bold uppercase pointer-events-none transition-opacity duration-300",
            "text-(--theme-accent) bg-(--theme-accent)/10 rounded-lg",
            "group-hover:opacity-0",
          )}
        >
          {displayLanguage}
        </div>

        <div className="absolute z-20 right-2 top-2">
          <CodeCopyButton code={code} />
        </div>

        {children}
      </div>
    </div>
  );
}
