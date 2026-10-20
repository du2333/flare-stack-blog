import { Loader2, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { SearchPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

/**
 * 检索页：索引卡的语感——大衬线页头 + 一条纸面检索线，
 * 结果用目录条（页边码省略，保留点线与摘要行）。
 */
export function SearchPage({
  query,
  results,
  isSearching,
  onQueryChange,
  onSelectPost,
}: SearchPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fuwari-card-base relative px-6 md:px-9 py-8 w-full yz-post fuwari-onload-animation">
      <div className="relative z-10">
        {/* 书脊页头 */}
        <header className="yz-book__head">
          <div className="yz-hero__pagemark">
            <svg width="34" height="10" viewBox="0 0 34 10" fill="none" aria-hidden="true">
              <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
              <path
                d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
                stroke="var(--yz-gold)"
                strokeWidth=".8"
                fill="none"
              />
            </svg>
            <span>Index · 索 引</span>
          </div>
          <h1 className="yz-book__title">{m.nav_search()}</h1>
        </header>

        {/* 检索线：一条底线，不是输入框盒子 */}
        <div className="yz-searchline">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={m.search_placeholder()}
            aria-label={m.nav_search()}
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin yz-searchline__spin" />
          )}
        </div>

        {/* 空态 */}
        {query.trim() === "" && (
          <p className="yz-search__hint">{m.search_fuwari_intro_desc()}</p>
        )}

        {query.trim() !== "" && !isSearching && results.length === 0 && (
          <div className="yz-search__hint">
            {m.search_no_results_with_query({ query })}
          </div>
        )}

        {/* 结果：目录条 */}
        <div className="yz-contents mt-2">
          {results.map((result, index) => (
            <article
              key={result.post.id}
              className="yz-tocline fuwari-onload-animation"
              style={{ animationDelay: `${120 + index * 45}ms` }}
            >
              <button
                type="button"
                onClick={() => onSelectPost(result.post.slug)}
                className="yz-tocline__link text-left w-full"
                style={{
                  viewTransitionName: `post-title-${result.post.slug}`,
                }}
              >
                <span className="yz-tocline__pno">
                  {`·${String(index + 1).padStart(2, "0")}`}
                </span>
                <span className="yz-tocline__body">
                  <span
                    className="yz-tocline__title"
                    dangerouslySetInnerHTML={{
                      __html: result.matches.title || result.post.title,
                    }}
                  />
                  <span className="yz-tocline__dots" aria-hidden="true" />
                  {result.post.tags.length > 0 && (
                    <span className="yz-tocline__meta">
                      <span className="yz-tocline__tag">
                        {result.post.tags[0]}
                      </span>
                    </span>
                  )}
                </span>
              </button>
              <p
                className="yz-tocline__summary"
                style={{ paddingLeft: "3.2rem", whiteSpace: "normal" }}
                dangerouslySetInnerHTML={{
                  __html:
                    result.matches.summary ||
                    result.post.summary ||
                    result.matches.contentSnippet ||
                    "",
                }}
              />
            </article>
          ))}
        </div>

        {results.length > 0 && (
          <div className="yz-search__foot">
            <Link to="/posts" className="yz-search__back">
              ← {m.posts_title()}
            </Link>
          </div>
        )}
      </div>

      {/* 高亮：命中的词用烫金 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .yz-post mark, .yz-contents mark {
            background-color: transparent;
            color: var(--yz-gold);
            font-weight: 500;
          }
        `,
        }}
      />
    </div>
  );
}
