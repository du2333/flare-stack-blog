import { memo, useState } from "react";
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

export const CodeBlock = memo(
  ({ code, language, highlightedHtml }: CodeBlockProps) => {
    const fallback = `<pre class="shiki font-mono text-sm leading-relaxed whitespace-pre-wrap text-(--fuwari-btn-content) bg-transparent! p-0 m-0 border-0"><code>${code}</code></pre>`;
    const html = highlightedHtml || fallback;

    const [copied, setCopied] = useState(false);

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
              copied &&
                "text-green-500 hover:text-green-500 scale-110 opacity-100", // success state overrides
            )}
          >
            <div className="w-4 h-4 relative flex items-center justify-center">
              {copied ? (
                /* Success Check Icon (Expressive Code exact SVG) */
                <svg
                  viewBox="0 -960 960 960"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 fill-current absolute animate-in zoom-in"
                >
                  <path d="m389-377.13 294.7-294.7q12.58-12.67 29.52-12.67 16.93 0 29.61 12.67 12.67 12.68 12.67 29.53 0 16.86-12.28 29.14L419.07-288.41q-12.59 12.67-29.52 12.67-16.94 0-29.62-12.67L217.41-430.93q-12.67-12.68-12.79-29.45-.12-16.77 12.55-29.45 12.68-12.67 29.62-12.67 16.93 0 29.28 12.67L389-377.13Z" />
                </svg>
              ) : (
                /* Copy Icon (Expressive Code exact SVG) */
                <svg
                  viewBox="0 -960 960 960"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 fill-current absolute"
                >
                  <path d="M368.37-237.37q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-474.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26h378.26q34.48 0 58.74 24.26 24.26 24.26 24.26 58.74v474.26q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H368.37Zm0-83h378.26v-474.26H368.37v474.26Zm-155 238q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-515.76q0-17.45 11.96-29.48 11.97-12.02 29.33-12.02t29.54 12.02q12.17 12.03 12.17 29.48v515.76h419.76q17.45 0 29.48 11.96 12.02 11.97 12.02 29.33t-12.02 29.54q-12.03 12.17-29.48 12.17H213.37Zm155-238v-474.26 474.26Z" />
                </svg>
              )}
            </div>
          </button>

          {/* Code Area */}
          <div className="relative p-0 overflow-x-auto custom-scrollbar rounded-b-xl">
            <div className="text-sm font-mono leading-relaxed transition-opacity duration-300">
              <div
                className="[&>pre]:px-5 [&>pre]:py-4 [&>pre]:m-0 [&>pre]:min-w-full [&>pre]:w-fit [&_code]:block [&_code]:w-fit [&>pre]:rounded-xl [&>pre>code]:p-0"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
