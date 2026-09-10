// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  readPostListLocation,
  savePostListLocation,
  readPostListPosition,
  savePostListPosition,
  DEFAULT_POST_LIST_LOCATION,
} from "./list-position";

afterEach(() => sessionStorage.clear());
it("restores a filtered page and keeps its scroll separate from other pages", () => {
  const location = {
    page: 2,
    status: "DRAFT" as const,
    sortBy: "publishedAt" as const,
    search: "example",
  };
  savePostListLocation(location);
  savePostListPosition(JSON.stringify(location), { top: 350, left: 0 });
  expect(readPostListLocation()).toEqual(location);
  expect(readPostListPosition(JSON.stringify(location))).toEqual({
    top: 350,
    left: 0,
  });
  expect(readPostListPosition("another-page")).toEqual({ top: 0, left: 0 });
});
it("ignores malformed saved state and bounds the position cache", () => {
  sessionStorage.setItem("fuwari:admin:post-list-location", '{"page":-1}');
  sessionStorage.setItem("fuwari:admin:post-list-positions", "broken");
  expect(readPostListLocation()).toEqual(DEFAULT_POST_LIST_LOCATION);
  expect(readPostListPosition("a")).toEqual({ top: 0, left: 0 });
  sessionStorage.removeItem("fuwari:admin:post-list-positions");
  for (let i = 0; i < 25; i++)
    savePostListPosition(String(i), { top: i, left: 0 });
  const saved = JSON.parse(
    sessionStorage.getItem("fuwari:admin:post-list-positions")!,
  );
  expect(Object.keys(saved)).toHaveLength(20);
  expect(saved["24"]).toEqual({ top: 24, left: 0 });
  expect(saved["0"]).toBeUndefined();
});
