import { z } from "zod";
import { SEARCH_TEXT_MAX_LENGTH } from "@/lib/constants";

/**
 * The Admin's Comments page: what awaits a reply, or every Comment. Kept here,
 * apart from the API's zod schemas, so the route's `validateSearch` can use it
 * without bringing them into the first load of every page.
 */
export const ADMIN_COMMENT_VIEWS = ["unreplied", "all"] as const;
export type AdminCommentView = (typeof ADMIN_COMMENT_VIEWS)[number];

/** The Admin's Comments address. */
export const adminCommentsSearchSchema = z.object({
  view: z
    .enum(ADMIN_COMMENT_VIEWS)
    .optional()
    .default("unreplied")
    .catch("unreplied"),
  page: z.number().int().positive().optional().default(1).catch(1),
  search: z
    .string()
    .max(SEARCH_TEXT_MAX_LENGTH)
    .optional()
    .default("")
    .catch(""),
  post: z.number().int().positive().optional().catch(undefined),
});

interface AdminCommentsAddress {
  view: AdminCommentView;
  page: number;
  search: string;
  post?: number;
}

/**
 * The 待回复 view has no search field and no Post filter, so an address that
 * carries either would filter a list the Admin cannot clear. Returns the
 * address without them, or null when it has none to drop.
 */
export function withoutHiddenFilters<T extends AdminCommentsAddress>(
  address: T,
): T | null {
  if (address.view !== "unreplied") return null;
  if (address.search === "" && address.post === undefined) return null;
  return { ...address, search: "", post: undefined, page: 1 };
}
