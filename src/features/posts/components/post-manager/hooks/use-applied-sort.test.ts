// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PostPopularity, SortField } from "../types";
import { appliedPostSort, useAppliedPostSort } from "./use-applied-sort";

afterEach(cleanup);

it.each<[SortField, PostPopularity | undefined, SortField]>([
  ["viewCount", "ready", "viewCount"],
  ["viewCount", undefined, "viewCount"],
  ["viewCount", "unconfigured", "updatedAt"],
  ["viewCount", "missing", "updatedAt"],
  ["viewCount", "expired", "updatedAt"],
  ["commentCount", "missing", "commentCount"],
  ["publishedAt", "unconfigured", "publishedAt"],
])("applies %s with popularity %s as %s", (sortBy, popularity, applied) => {
  expect(appliedPostSort(sortBy, popularity)).toBe(applied);
});

it("replaces a views sort that cannot be applied with the default, and shows it meanwhile", () => {
  const onSortByChange = vi.fn();
  const { result, rerender } = renderHook(
    ({ popularity }: { popularity: PostPopularity | undefined }) =>
      useAppliedPostSort("viewCount", popularity, onSortByChange),
    { initialProps: { popularity: undefined as PostPopularity | undefined } },
  );
  expect(result.current).toBe("viewCount");
  expect(onSortByChange).not.toHaveBeenCalled();

  rerender({ popularity: "missing" });
  expect(result.current).toBe("updatedAt");
  expect(onSortByChange).toHaveBeenCalledExactlyOnceWith("updatedAt", true);
});

it("leaves the address alone while the views can be sorted by", () => {
  const onSortByChange = vi.fn();
  const { result } = renderHook(() =>
    useAppliedPostSort("viewCount", "ready", onSortByChange),
  );
  expect(result.current).toBe("viewCount");
  expect(onSortByChange).not.toHaveBeenCalled();
});
