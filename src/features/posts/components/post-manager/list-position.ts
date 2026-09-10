import {
  SORT_FIELDS,
  STATUS_FILTERS,
  type SortField,
  type StatusFilter,
} from "./types";

export type PostListLocation = {
  page: number;
  status: StatusFilter;
  sortBy: SortField;
  search: string;
};
const LOCATION_KEY = "fuwari:admin:post-list-location";
const POSITIONS_KEY = "fuwari:admin:post-list-positions";
export const DEFAULT_POST_LIST_LOCATION: PostListLocation = {
  page: 1,
  status: "ALL",
  sortBy: "updatedAt",
  search: "",
};
export function readPostListLocation(): PostListLocation {
  try {
    const value = JSON.parse(sessionStorage.getItem(LOCATION_KEY) ?? "null");
    if (
      value &&
      Number.isInteger(value.page) &&
      value.page > 0 &&
      STATUS_FILTERS.includes(value.status) &&
      SORT_FIELDS.includes(value.sortBy) &&
      typeof value.search === "string"
    )
      return value;
  } catch {
    /* Storage is optional; normal navigation must still work. */
  }
  return DEFAULT_POST_LIST_LOCATION;
}
export function savePostListLocation(value: PostListLocation) {
  try {
    sessionStorage.setItem(LOCATION_KEY, JSON.stringify(value));
  } catch {
    /* optional */
  }
}
export type ListScrollPosition = { top: number; left: number };
export function readPostListPosition(key: string): ListScrollPosition {
  try {
    const position = JSON.parse(sessionStorage.getItem(POSITIONS_KEY) ?? "{}")[
      key
    ];
    if (
      position &&
      Number.isFinite(position.top) &&
      position.top >= 0 &&
      Number.isFinite(position.left) &&
      position.left >= 0
    )
      return position;
  } catch {
    /* optional */
  }
  return { top: 0, left: 0 };
}
export function savePostListPosition(
  key: string,
  position: ListScrollPosition,
) {
  try {
    const positions = JSON.parse(sessionStorage.getItem(POSITIONS_KEY) ?? "{}");
    delete positions[key];
    const entries = Object.entries(positions).slice(-19);
    sessionStorage.setItem(
      POSITIONS_KEY,
      JSON.stringify(Object.fromEntries([...entries, [key, position]])),
    );
  } catch {
    /* optional */
  }
}
