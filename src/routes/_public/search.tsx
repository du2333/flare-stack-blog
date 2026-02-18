import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import theme from "@theme";
import {
  searchDocsQueryOptions,
  searchMetaQuery,
} from "@/features/search/queries";
import { useDebounce } from "@/hooks/use-debounce";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_public/search")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SearchRoute,
  loader: () => {
    return {
      title: "搜索",
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

  const [query, setQuery] = useState(search.q || "");

  useEffect(() => {
    if (search.q !== undefined && search.q !== query) {
      setQuery(search.q);
    }
  }, [search.q]);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery !== (search.q || "")) {
      navigate({
        search: (prev) => ({
          ...prev,
          q: debouncedQuery || undefined,
        }),
        replace: true,
      });
    }
  }, [debouncedQuery, navigate, search.q]);

  const { data: meta } = useQuery({
    ...searchMetaQuery,
    staleTime: 5 * 60 * 1000,
  });

  const { data: results, isLoading: isSearching } = useQuery({
    ...searchDocsQueryOptions(debouncedQuery, meta?.version || "init"),
    enabled: debouncedQuery.length > 0 && !!meta?.version,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const searchResults = useMemo(() => results ?? [], [results]);

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
    <theme.SearchPage
      query={query}
      results={searchResults}
      isSearching={isSearching}
      onQueryChange={handleQueryChange}
      onSelectPost={handleSelectPost}
      onBack={handleBack}
    />
  );
}
