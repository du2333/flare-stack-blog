import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useContentMotion } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import "./search-page.css";

interface SearchResultItem {
  post: {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    tags: string[];
  };
  score: number;
  matches: {
    title: string | null;
    summary: string | null;
    contentSnippet: string | null;
  };
}
interface SearchPageProps {
  query: string;
  searchedQuery: string;
  results: SearchResultItem[];
  isSearching: boolean;
  hasError: boolean;
  onQueryChange: (query: string) => void;
  onCompositionChange: (composing: boolean) => void;
  onRetry: () => void;
}
export function SearchPage({
  query,
  searchedQuery,
  results,
  isSearching,
  hasError,
  onQueryChange,
  onCompositionChange,
  onRetry,
}: SearchPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasQuery = query.trim().length > 0;
  useEffect(() => {
    // Avoid opening the software keyboard automatically on touch devices.
    if (window.matchMedia("(pointer: fine)").matches)
      inputRef.current?.focus({ preventScroll: true });
  }, []);
  useContentMotion(
    resultsRef,
    !hasQuery
      ? "empty"
      : isSearching
        ? "loading"
        : hasError
          ? "error"
          : `${searchedQuery}:${results.map((result) => result.post.id).join(",")}`,
  );
  const clear = () => {
    onQueryChange("");
    inputRef.current?.focus();
  };
  return (
    <section className="public-search fuwari-card-base">
      <h1>{m.search_page_heading()}</h1>
      <div role="search" className="public-search-field">
        <Search size={20} strokeWidth={1.5} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          aria-label={m.search_placeholder()}
          placeholder={m.search_placeholder()}
          onChange={(event) => onQueryChange(event.target.value)}
          onCompositionStart={() => onCompositionChange(true)}
          onCompositionEnd={() => onCompositionChange(false)}
        />
        {query && (
          <button type="button" onClick={clear} aria-label={m.search_clear()}>
            <X size={18} />
          </button>
        )}
      </div>
      <p className="public-search-caption" role="status" aria-live="polite">
        {hasQuery ? (
          isSearching ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {m.search_loading()}
            </>
          ) : hasError ? (
            m.search_failed()
          ) : (
            m.search_result_count({ count: results.length })
          )
        ) : (
          m.search_fuwari_intro_desc()
        )}
      </p>
      <div ref={resultsRef} aria-busy={isSearching}>
        {!hasQuery ? (
          <div className="public-search-empty">
            <Search size={28} strokeWidth={1.5} />
            <h2>{m.search_fuwari_intro_title()}</h2>
          </div>
        ) : hasError ? (
          <div className="public-search-empty">
            <p>{m.search_retry_hint()}</p>
            <button
              type="button"
              className="fuwari-btn-regular"
              onClick={onRetry}
            >
              {m.search_retry()}
            </button>
          </div>
        ) : results.length ? (
          <ul className="public-search-results" data-updating={isSearching}>
            {results.map((result) => (
              <li key={result.post.id}>
                <Link
                  to="/post/$slug"
                  params={{ slug: result.post.slug }}
                  className="public-search-result"
                >
                  <h2>
                    <Highlighted
                      html={result.matches.title}
                      fallback={result.post.title}
                    />
                  </h2>
                  <p className="public-search-excerpt">
                    <Highlighted
                      html={
                        result.matches.summary ||
                        (!result.post.summary
                          ? result.matches.contentSnippet
                          : null)
                      }
                      fallback={result.post.summary || ""}
                    />
                  </p>
                  {result.post.tags.length > 0 && (
                    <div className="public-search-tags">
                      {result.post.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                  <ChevronRight
                    className="public-search-arrow"
                    size={18}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : isSearching ? (
          <div className="public-search-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="public-search-empty">
            <Search size={28} strokeWidth={1.5} />
            <h2>{m.search_no_results()}</h2>
            <p>{m.search_no_results_with_query({ query: searchedQuery })}</p>
            <p>{m.search_empty_hint()}</p>
          </div>
        )}
      </div>
    </section>
  );
}

const entities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
};
function decode(text: string) {
  return text.replace(
    /&(?:amp|lt|gt|quot|#039);/g,
    (entity) => entities[entity],
  );
}
/** Render only the search API's mark delimiters; titles and excerpts remain text. */
function Highlighted({
  html,
  fallback,
}: {
  html: string | null;
  fallback: string;
}) {
  if (!html) return fallback;
  return html
    .split(/(<mark>.*?<\/mark>)/gs)
    .map((part, index) =>
      part.startsWith("<mark>") && part.endsWith("</mark>") ? (
        <mark key={index}>{decode(part.slice(6, -7))}</mark>
      ) : (
        decode(part)
      ),
    );
}
