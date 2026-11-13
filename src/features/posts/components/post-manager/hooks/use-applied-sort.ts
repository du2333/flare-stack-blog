import { useEffect } from "react";
import type { PostPopularity, SortField } from "../types";

/**
 * The sort the server applies. Views come from the popularity snapshot, and
 * while it cannot be read the server sorts by the last change instead.
 * Popularity is unknown until the first page arrives, and unknown is no reason
 * to change the sort.
 */
export function appliedPostSort(
  sortBy: SortField,
  popularity: PostPopularity | undefined,
): SortField {
  return sortBy === "viewCount" &&
    popularity !== undefined &&
    popularity !== "ready"
    ? "updatedAt"
    : sortBy;
}

/**
 * The sort to show, and the address corrected to it without a history entry
 * when it asks for views that cannot be sorted by.
 */
export function useAppliedPostSort(
  sortBy: SortField,
  popularity: PostPopularity | undefined,
  onSortByChange: (sortBy: SortField, replace?: boolean) => void,
): SortField {
  const applied = appliedPostSort(sortBy, popularity);
  useEffect(() => {
    if (applied !== sortBy) onSortByChange(applied, true);
  }, [applied, sortBy, onSortByChange]);
  return applied;
}
