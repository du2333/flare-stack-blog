import { SearchQuerySchema } from "@/features/search/search.schema";
import * as SearchService from "@/features/search/service/search.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";

const search = publicProcedure
  .route({
    method: "GET",
    path: "/search",
    summary: "Search published posts",
    tags: ["Search"],
  })
  .input(SearchQuerySchema)
  .handler(({ context, input }) => SearchService.search(context, input));

const version = publicProcedure
  .route({
    method: "GET",
    path: "/search/version",
    summary: "Get search index version",
    tags: ["Search"],
  })
  .handler(({ context }) => SearchService.getIndexVersion(context));

const rebuild = adminProcedure
  .route({
    method: "POST",
    path: "/admin/search/rebuild",
    summary: "Rebuild the search index",
    tags: ["Admin Search"],
  })
  .handler(({ context }) => SearchService.rebuildIndex(context));

export default {
  search,
  version,
  rebuild,
};
