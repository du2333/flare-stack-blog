import type { AdminCommentView } from "@/features/comments/comments.schema";

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
