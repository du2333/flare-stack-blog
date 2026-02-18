import { ArrowLeft } from "lucide-react";
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
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20">
      <header className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-mono text-xs uppercase tracking-widest">
            返回
          </span>
        </button>
      </header>

      <section className="mb-16">
        <div className="relative flex items-center gap-4 border-b border-border/30 pb-4 focus-within:border-foreground transition-all">
          <div className="flex-1">
            <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 opacity-50">
              搜索文章
            </label>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="..."
              className="w-full bg-transparent text-4xl md:text-5xl font-serif text-foreground placeholder:text-muted-foreground/10 focus:outline-none rounded-none selection:bg-foreground selection:text-background"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {query.trim() !== "" && !isSearching && results.length === 0 && (
          <div className="py-12 opacity-50">
            <p className="font-serif text-lg text-muted-foreground">
              未找到相关文章 "{query}"
            </p>
          </div>
        )}

        {results.map((result) => {
          return (
            <div
              key={result.post.id}
              onClick={() => onSelectPost(result.post.slug)}
              className="group relative cursor-pointer p-4 -mx-4 transition-all duration-300 rounded-lg hover:bg-muted/10"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h4
                    className="text-lg md:text-xl text-muted-foreground font-serif tracking-tight transition-colors duration-300 group-hover:text-foreground"
                    style={{
                      viewTransitionName: `post-title-${result.post.slug}`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: result.matches.title || result.post.title,
                    }}
                  />
                </div>

                <p
                  className="text-sm font-sans text-muted-foreground line-clamp-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                  dangerouslySetInnerHTML={{
                    __html: result.matches.summary || result.post.summary || "",
                  }}
                />

                {result.post.tags.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {result.post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground/60 border border-border/30 px-1.5 py-0.5 rounded-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
