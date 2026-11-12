import { m } from "@/paraglide/messages";

export type TaxonomyKind = "category" | "tag";

export type TaxonomyItem = {
  id: number;
  name: string;
  /** Posts that carry it in their draft. */
  postCount: number;
  /** Published posts the public site shows it on. */
  publicPostCount: number;
};

/** The same 50-character limit the create and update inputs enforce. */
export const NAME_MAX_LENGTH = 50;

/** Items whose name contains the query, ignoring case. */
export function filterTaxonomy(items: Array<TaxonomyItem>, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => item.name.toLowerCase().includes(needle));
}

/** The tags no post uses. */
export function unusedTags(items: Array<TaxonomyItem>) {
  return items.filter((item) => !item.postCount);
}

/**
 * What deleting removes at once: the draft assignments of every post, and the
 * public ones of the published posts, which go live without a publish. The
 * confirmation states how many posts that is.
 */
export function deleteMessage(kind: TaxonomyKind, item: TaxonomyItem | null) {
  const name = item?.name ?? "";
  const count = item?.postCount ?? 0;
  const published = item?.publicPostCount ?? 0;
  if (kind === "category") {
    if (count === 0)
      return m.admin_taxonomy_delete_category_desc_unused({ name });
    return published > 0
      ? m.admin_taxonomy_delete_category_desc({ name, count, published })
      : m.admin_taxonomy_delete_category_desc_draft_only({ name, count });
  }
  if (count === 0) return m.admin_taxonomy_delete_tag_desc_unused({ name });
  return published > 0
    ? m.admin_taxonomy_delete_tag_desc({ name, count, published })
    : m.admin_taxonomy_delete_tag_desc_draft_only({ name, count });
}
