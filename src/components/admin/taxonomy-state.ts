import { z } from "zod";

export const taxonomySearchSchema = z.object({
  kind: z
    .enum(["category", "tag", "uncategorized"])
    .default("category")
    .catch("category"),
  id: z.number().int().positive().optional().catch(undefined),
  scope: z.enum(["current", "public"]).default("current").catch("current"),
  page: z.number().int().positive().default(1).catch(1),
  search: z.string().default("").catch(""),
  sortBy: z
    .enum(["updatedAt", "publishedAt"])
    .default("updatedAt")
    .catch("updatedAt"),
});
export type TaxonomyState = z.infer<typeof taxonomySearchSchema>;
export type TaxonomyReturn = { search: TaxonomyState; scrollTop: number };

declare module "@tanstack/history" {
  interface HistoryState {
    taxonomyReturn?: TaxonomyReturn;
    taxonomyScrollTop?: number;
  }
}
