import * as SearchService from "@/features/search/service/search.service";

export async function searchPosts(
  context: DbContext,
  data: {
    q: string;
    limit?: number;
  },
) {
  const version = await SearchService.getIndexVersion(context);

  return SearchService.search(context, {
    q: data.q,
    limit: data.limit ?? 10,
    v: version?.version ?? "init",
  });
}
