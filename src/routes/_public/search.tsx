import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (urlQuery !== query && urlQuery !== debouncedQuery) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    navigate({
      search: (prev) => ({
        ...prev,
        q: debouncedQuery || undefined,
      }),
      replace: true,
    });
  }, [debouncedQuery, navigate, urlQuery]);

  const { data: meta } = useQuery({
    ...searchMetaQuery,
    staleTime: 5 * 60 * 1000,
  });

  const { data: results, isFetching } = useQuery({
    ...searchDocsQueryOptions(debouncedQuery, meta?.version || "init"),
    enabled: debouncedQuery.length > 0 && !!meta?.version,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const searchResults = useMemo(() => results ?? [], [results]);
  const isSearching = debouncedQuery.length > 0 && isFetching;

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const handleSelectPost = (slug: string) => {
    navigate({ to: "/post/$slug", params: { slug } });
  };

  const handleBack = () => {
    navigate({ to: "/" });
  };

  return (
    <SearchPage
      query={query}
      searchedQuery={debouncedQuery}
      results={searchResults}
      isSearching={isSearching}
      onQueryChange={handleQueryChange}
      onSelectPost={handleSelectPost}
      onBack={handleBack}
    />
  );
}
