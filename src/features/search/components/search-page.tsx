import { Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Spinner } from "@/components/ui/spinner";
import { useContentMotion } from "@/hooks/use-motion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchHighlight } from "@/features/search/components/search-highlight";
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
  return (
    <section className="public-search fuwari-card-base fuwari-card-panel">
      <h1>{m.search_page_heading()}</h1>
      <SearchField
        ref={inputRef}
        size="lg"
        value={query}
        aria-label={m.search_placeholder()}
        placeholder={m.search_placeholder()}
        onValueChange={onQueryChange}
        onCompositionStart={() => onCompositionChange(true)}
        onCompositionEnd={() => onCompositionChange(false)}
        clearLabel={m.search_clear()}
      />
      <p className="public-search-caption" role="status" aria-live="polite">
        {hasQuery ? (
          isSearching ? (
            <>
              <Spinner size={14} />
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
          <EmptyState icon={Search} title={m.search_fuwari_intro_title()} />
        ) : hasError ? (
          <EmptyState
            description={m.search_retry_hint()}
            action={
              <Button size="lg" onClick={onRetry}>
                {m.search_retry()}
              </Button>
            }
          />
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
                    <SearchHighlight
                      html={result.matches.title}
                      fallback={result.post.title}
                    />
                  </h2>
                  <p className="public-search-excerpt">
                    <SearchHighlight
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
                        <Badge key={tag}>#{tag}</Badge>
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
            <Skeleton className="h-6 w-[65%] rounded-md" />
            <Skeleton className="h-4.5 rounded-md" />
            <Skeleton className="h-4.5 w-4/5 rounded-md" />
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title={m.search_no_results()}
            description={
              <>
                <p>
                  {m.search_no_results_with_query({ query: searchedQuery })}
                </p>
                <p>{m.search_empty_hint()}</p>
              </>
            }
          />
        )}
      </div>
    </section>
  );
}
