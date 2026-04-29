import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Keyboard, Loader2, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  searchDocsQueryOptions,
  searchMetaQuery,
} from "@/features/search/queries";
import { useDebounce } from "@/hooks/use-debounce";
import type { SearchResultItem } from "@/features/theme/contract/pages/search";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  originX?: string;
  originY?: string;
}

/**
 * Full-screen Search Overlay — Amazing Theme
 *
 * Opens with a clip-path circle expansion from the search icon position.
 * Closes with reverse collapse animation.
 * Features: auto-focus, debounced search via TanStack Query + Orama,
 * keyboard shortcut (Esc to close), staggered result card entrance.
 */
export function SearchOverlay({
  isOpen,
  onClose,
  originX = "90%",
  originY = "2rem",
}: SearchOverlayProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 300);

  // Fetch search index meta for version
  const { data: meta } = useQuery({
    ...searchMetaQuery,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  // Search docs using Orama
  const { data: results, isLoading: isSearching } = useQuery({
    ...searchDocsQueryOptions(debouncedQuery, meta?.version || "init"),
    enabled: debouncedQuery.length > 0 && !!meta?.version && isOpen,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const searchResults = useMemo(() => results ?? [], [results]);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen && !isClosing) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setQuery("");
      onClose();
    }, 380);
  }, [onClose]);

  const handleSelectPost = useCallback(
    (slug: string) => {
      handleClose();
      setTimeout(() => {
        navigate({ to: "/post/$slug", params: { slug } });
      }, 200);
    },
    [handleClose, navigate],
  );

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9998] bg-(--fuwari-page-bg)/95 backdrop-blur-xl",
        isClosing
          ? "amazing-search-overlay is-closing"
          : "amazing-search-overlay",
      )}
      style={
        {
          "--origin-x": originX,
          "--origin-y": originY,
        } as React.CSSProperties
      }
    >
      <div className="relative w-full h-full flex flex-col max-w-3xl mx-auto px-4 pt-20 pb-8">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-12 h-12 rounded-xl flex items-center justify-center fuwari-btn-regular hover:scale-110 active:scale-95 transition-all"
          aria-label="Close search"
        >
          <X size={22} strokeWidth={1.5} />
        </button>

        {/* Search input */}
        <div
          className="fuwari-onload-animation mb-8"
          style={{ animationDelay: "200ms" }}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-5 w-6 h-6 fuwari-text-30 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.search_placeholder()}
              className="w-full pl-14 pr-14 py-5 rounded-2xl border-2 border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:border-(--fuwari-primary)/60 focus:bg-(--fuwari-primary)/5 transition-all fuwari-text-90 text-xl placeholder:text-black/25 dark:placeholder:text-white/25 focus:shadow-[0_0_30px_rgba(var(--amazing-primary-rgb),0.15)]"
            />
            {isSearching && (
              <div className="absolute right-5 fuwari-text-50">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
          {/* Empty state */}
          {query.trim() === "" && (
            <div
              className="flex-1 flex flex-col items-center justify-center text-center fuwari-onload-animation"
              style={{ animationDelay: "350ms" }}
            >
              <div className="w-20 h-20 rounded-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center mb-6 text-(--fuwari-btn-content)">
                <Keyboard size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold fuwari-text-75 mb-3">
                {m.search_fuwari_intro_title()}
              </h3>
              <p className="text-sm fuwari-text-50 max-w-sm">
                {m.search_fuwari_intro_desc()}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs fuwari-text-30">
                <kbd className="px-2 py-1 rounded-md bg-(--fuwari-btn-regular-bg) font-mono">
                  ESC
                </kbd>
                <span>to close</span>
              </div>
            </div>
          )}

          {/* No results */}
          {query.trim() !== "" && !isSearching && searchResults.length === 0 && (
            <div
              className="flex-1 flex flex-col items-center justify-center text-center fuwari-onload-animation"
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

          {/* Result cards with staggered entrance */}
          {searchResults.map((result: SearchResultItem, index: number) => (
            <button
              key={result.post.id}
              onClick={() => handleSelectPost(result.post.slug)}
              className="fuwari-card-base p-5 text-left w-full group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-(--fuwari-primary)/50 amazing-animate-in"
              style={{
                animationDelay: `${index * 60}ms`,
              }}
            >
              <h2
                className="text-lg font-bold fuwari-text-90 group-hover:text-(--fuwari-primary) transition-colors"
                dangerouslySetInnerHTML={{
                  __html: result.matches?.title || result.post.title,
                }}
              />
              {(result.matches?.summary ||
                result.post.summary ||
                result.matches?.contentSnippet) && (
                <p
                  className="text-sm fuwari-text-75 line-clamp-2 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html:
                      result.matches?.summary ||
                      result.post.summary ||
                      result.matches?.contentSnippet ||
                      "",
                  }}
                />
              )}
              {result.post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 mt-auto">
                  {result.post.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs font-mono text-(--fuwari-btn-content) bg-(--fuwari-btn-regular-bg) px-2 py-0.5 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Global mark style */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .amazing-search-overlay mark {
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
