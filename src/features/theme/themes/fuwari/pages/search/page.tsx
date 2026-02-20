import { ArrowLeft, Keyboard, Loader2, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SearchPageProps } from "@/features/theme/contract/pages";

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
    // Small delay to ensure the page has transitioned before focusing
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header Area */}
      <div
        className="fuwari-card-base p-6 md:p-8 flex items-center gap-4 fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <button
          onClick={onBack}
          className="group flex items-center justify-center w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content) hover:bg-(--fuwari-btn-regular-bg-hover) transition-colors shrink-0"
          title="返回"
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
        </button>

        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-4 w-5 h-5 fuwari-text-30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索文章..."
            className="w-full pl-12 pr-12 py-3 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:border-(--fuwari-primary)/50 focus:bg-(--fuwari-primary)/5 transition-all fuwari-text-90 text-lg md:text-xl placeholder:text-black/30 dark:placeholder:text-white/30"
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
            style={{ animationDelay: "200ms" }}
          >
            <div className="w-20 h-20 rounded-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center mb-6 text-(--fuwari-btn-content)">
              <Keyboard size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold fuwari-text-75 mb-3">
              探索海量内容
            </h3>
            <p className="text-sm fuwari-text-50 max-w-sm">
              在上方输入关键词开始搜索，支持全文检索。您可以搜索文章标题、摘要、标签或正文内容。
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
              未找到结果
            </h3>
            <p className="text-sm fuwari-text-50">
              抱歉，没有找到关于 "{query}" 的相关内容，请尝试其他关键词。
            </p>
          </div>
        )}

        {results.map((result, index) => (
          <button
            key={result.post.id}
            onClick={() => onSelectPost(result.post.slug)}
            className="fuwari-card-base p-6 text-left w-full group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col gap-3 fuwari-onload-animation outline-none focus-visible:ring-2 focus-visible:ring-(--fuwari-primary)/50"
            style={{ animationDelay: `${200 + index * 50}ms` }}
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

            {/* Embedded highlighting styles for the dynamically injected HTML */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
              #search-card-${result.post.id} mark {
                background-color: transparent;
                color: var(--fuwari-primary);
                font-weight: 600;
              }
            `,
              }}
            />
            <div id={`search-card-${result.post.id}`} className="hidden" />
          </button>
        ))}

        {/* Global highlighting style for all result cards */}
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
