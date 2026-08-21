import { orpc } from "@/lib/orpc";

export const searchMetaQuery = orpc.search.version.queryOptions();

export const searchDocsQueryOptions = (query: string, version: string) =>
  orpc.search.search.queryOptions({
    input: { q: query, v: version },
  });
