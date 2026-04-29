import { ArrowLeft, Keyboard, Loader2, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SearchPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

/**
 * Enhanced Search Page — Amazing Theme
 *
 * Features:
 * - Search input with focus glow effect
 * - Result cards with staggered bounce-in entrance
 * - Pulse animation on empty state icon
 * - Gradient underline on result hover
 */
export function SearchPage({
  query,
  results,
  isSearching,
  onQueryChange,
  onSelectPost,
  onBack,
}: SearchPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header Area */}
      <div
        className="fuwari-card-base p-6 md:p-8 flex items-center gap-4 fuwari-onload-animation"
        style={{
          animationDelay: "100ms",
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        <button
          onClick={onBack}
          className="group flex items-center justify-center w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) hover:bg-(--fuwari-btn-regular-bg-hover) transition-all shrink-0 hover:scale-110 active:scale-95"
          title={m.search_back()}
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform duration-300"
          />
        </button>

        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-4 w-5 h-5 fuwari-text-30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={m.search_placeholder()}
            className="w-full pl-12 pr-12 py-3 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all fuwari-text-90 text-lg md:text-xl placeholder:text-black/30 dark:placeholder:text-white/30 focus:shadow-[0_0_24px_rgba(var(--amazing-primary-rgb),0.12)]"
          />
          {isSearching && (
            <div className="absolute right-4 w-5 h-5 fuwari-text-50 pointer-events-none flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="flex flex-col gap-4">
        {query.trim() === "" && (
          <div
            className="fuwari-card-base p-16 flex flex-col items-center justify-center text-center fuwari-onload-animation"
            style={{
              animationDelay: "200ms",
              animationName: "amazing-scale-bounce",
              animationDuration: "600ms",
              animationTimingFunction: "var(--amazing-spring)",
            }}
          >
            <div className="w-20 h-20 rounded-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center mb-6 text-(--fuwari-btn-content) amazing-glow">
              <Keyboard size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold fuwari-text-75 mb-3">
              {m.search_fuwari_intro_title()}
            </h3>
            <p className="text-sm fuwari-text-50 max-w-sm">
              {m.search_fuwari_intro_desc()}
            </p>
          </div>
        )}

        {query.trim() !== "" && !isSearching && results.length === 0 && (
          <div
            className="fuwari-card-base p-12 flex flex-col items-center justify-center text-center fuwari-onload-animation"
            style={{ animationDelay: "200ms" }}
          >
            <div className="w-16 h-16 rounded-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center mb-4 text-(--fuwari-btn-content)">
              <Search size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold fuwari-text-75 mb-2">
              {m.search_no_results()}
            </h3>
            <p className="text-sm fuwari-text-50">
              {m.search_no_results_with_query({ query })}
            </p>
          </div>
        )}

        {results.map((result, index) => (
          <button
            key={result.post.id}
            onClick={() => onSelectPost(result.post.slug)}
            className="fuwari-card-base p-6 text-left w-full group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col gap-3 amazing-animate-in outline-none focus-visible:ring-2 focus-visible:ring-(--fuwari-primary)/50"
            style={{ animationDelay: `${200 + index * 60}ms` }}
          >
            {/* Title with highlighting */}
            <h2
              className="text-xl font-bold fuwari-text-90 group-hover:text-(--fuwari-primary) transition-colors"
              style={{
                viewTransitionName: `post-title-${result.post.slug}`,
              }}
              dangerouslySetInnerHTML={{
                __html: result.matches.title || result.post.title,
              }}
            />

            {/* Summary with highlighting */}
            <p
              className="text-sm fuwari-text-75 line-clamp-3 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html:
                  result.matches.summary ||
                  result.post.summary ||
                  result.matches.contentSnippet ||
                  "",
              }}
            />

            {/* Tags */}
            {result.post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                {result.post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono text-(--fuwari-btn-content) bg-(--fuwari-btn-regular-bg) px-2 py-1 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}

        {/* Global highlighting style */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .fuwari-card-base mark {
            background-color: transparent;
            color: var(--fuwari-primary);
            font-weight: 600;
            padding: 0 0.1em;
          }
        `,
          }}
        />
      </div>
    </div>
  );
}
