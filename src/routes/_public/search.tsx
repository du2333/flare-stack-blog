import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SearchPage } from "@/features/search/components/search-page";
import {
  searchDocsQueryOptions,
  searchMetaQuery,
} from "@/features/search/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_public/search")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SearchRoute,
  loader: () => {
    return {
      title: m.search_title(),
    };
  },
  head: ({ loaderData }) => {
    return {
      meta: [
        {
          title: loaderData?.title,
        },
      ],
    };
  },
});

function SearchRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const urlQuery = search.q || "";
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, 300);
  const [composing, setComposing] = useState(false);
  const term = debouncedQuery.trim();

  useEffect(() => {
    if (urlQuery !== query && urlQuery !== debouncedQuery) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (composing || debouncedQuery === urlQuery) return;
    navigate({
      search: (prev) => ({
        ...prev,
        q: debouncedQuery || undefined,
      }),
      replace: true,
    });
  }, [debouncedQuery, navigate, urlQuery, composing]);

  const metaQuery = useQuery({
    ...searchMetaQuery,
    staleTime: 5 * 60 * 1000,
  });

  const resultQuery = useQuery({
    ...searchDocsQueryOptions(term, metaQuery.data?.version || "init"),
    enabled: term.length > 0 && !!metaQuery.data?.version && !composing,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const waitingForInput = query.trim() !== term || composing;
  const hasError =
    !waitingForInput && (metaQuery.isError || resultQuery.isError);
  const isSearching =
    query.trim().length > 0 &&
    !hasError &&
    (waitingForInput || metaQuery.isPending || resultQuery.isFetching);

  return (
    <SearchPage
      query={query}
      searchedQuery={term}
      results={resultQuery.data ?? []}
      isSearching={isSearching}
      hasError={hasError}
      onQueryChange={setQuery}
      onCompositionChange={setComposing}
      onRetry={() => {
        void (metaQuery.isError ? metaQuery.refetch() : resultQuery.refetch());
      }}
    />
  );
}
