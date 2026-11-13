import {
  BookOpen,
  Compass,
  FileText,
  Folder,
  Globe,
  Home,
  Link2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type {
  NavLinkOption,
  NavOption,
} from "@/components/layout/layout-props";
import {
  currentNavLink,
  isNavGroup,
  isNavOptionCurrent,
  normaliseNavPath,
} from "@/components/layout/nav-options";

/**
 * What a group is known by in the rail's state: its name, and for a second
 * group of the same name its place among them. Not its id, which is its
 * position in the Site Config (`custom-<i>`): after a reorder an id names
 * another group, a name still names the same one. A group that is renamed is
 * a new group; groups of one name that swap places swap states, which no one
 * can tell apart.
 */
export function groupKeys(
  navOptions: ReadonlyArray<NavOption>,
): Map<string, string> {
  const seen = new Map<string, number>();
  const keys = new Map<string, string>();
  for (const option of navOptions) {
    if (!isNavGroup(option)) continue;
    const count = (seen.get(option.label) ?? 0) + 1;
    seen.set(option.label, count);
    keys.set(
      option.id,
      count === 1 ? option.label : `${option.label}#${count}`,
    );
  }
  return keys;
}

/** The key of the group that holds the link the page belongs to, or null. */
function holderKey(
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): string | null {
  const current = currentNavLink(navOptions, pathname);
  const keys = groupKeys(navOptions);
  const holder = navOptions.find(
    (option) => isNavGroup(option) && isNavOptionCurrent(option, current),
  );
  return holder ? (keys.get(holder.id) ?? null) : null;
}

/**
 * Which groups of the rail are open, and what the pill last moved for.
 *
 * - `open` holds the keys (`groupKeys`) of the open groups.
 * - `holder` is the key of the group that holds the current link, or null:
 *   when it changes to another group, that group opens, so the page's link is
 *   in view; while it stays the same, the reader's choice stands.
 * - `path` is the page this state has seen, and `moved` says what moved the
 *   pill last: `fold` for a group that was opened or closed on that page,
 *   `page` for a change of page.
 */
export interface RailGroups {
  open: ReadonlySet<string>;
  holder: string | null;
  path: string;
  moved: "page" | "fold";
}

/** On the first render: the group that holds the current link is open. */
export function initialRailGroups(
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): RailGroups {
  const holder = holderKey(navOptions, pathname);
  return {
    open: new Set(holder ? [holder] : []),
    holder,
    path: pathname,
    moved: "page",
  };
}

/**
 * The state for the navigation and the page as they are now. It drops the
 * keys of groups that are gone, opens the group the current link has come
 * to lie in from outside, and takes a change of page for what moved the pill.
 * It returns `state` itself when nothing of it changes.
 */
export function reconcileRailGroups(
  state: RailGroups,
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): RailGroups {
  const known = new Set(groupKeys(navOptions).values());
  const holder = holderKey(navOptions, pathname);
  const open = new Set([...state.open].filter((key) => known.has(key)));
  if (holder && holder !== state.holder) open.add(holder);
  const moved = pathname === state.path ? state.moved : "page";
  const unchanged =
    holder === state.holder &&
    pathname === state.path &&
    moved === state.moved &&
    open.size === state.open.size &&
    [...open].every((key) => state.open.has(key));
  return unchanged ? state : { open, holder, path: pathname, moved };
}

/** The reader opens or closes the group with this key. */
export function toggleRailGroup(state: RailGroups, key: string): RailGroups {
  const open = new Set(state.open);
  if (!open.delete(key)) open.add(key);
  return { ...state, open, moved: "fold" };
}

/** The ids, in the navigation as it is, of the groups that are open. */
export function openGroupIds(
  navOptions: ReadonlyArray<NavOption>,
  state: RailGroups,
): Set<string> {
  return new Set(
    [...groupKeys(navOptions)]
      .filter(([, key]) => state.open.has(key))
      .map(([id]) => id),
  );
}

/**
 * The rows the rail shows from the top, in order: each entry's row, and under
 * a group that is open a row for each of its links. Every row is as high as
 * the others and stands the same distance from them, so where a row stands
 * is its place in this list.
 */
export function visibleRows(
  navOptions: ReadonlyArray<NavOption>,
  open: ReadonlySet<string>,
): Array<NavOption> {
  return navOptions.flatMap((option) =>
    isNavGroup(option) && open.has(option.id)
      ? [option, ...option.children]
      : [option],
  );
}

/**
 * The place, among the visible rows, of the row the pill stands on, or -1
 * when the page belongs to no entry: the row of the current link, or the row
 * of its group while the group is closed.
 */
export function currentRowIndex(
  navOptions: ReadonlyArray<NavOption>,
  open: ReadonlySet<string>,
  pathname: string,
): number {
  const current = currentNavLink(navOptions, pathname);
  return visibleRows(navOptions, open).findIndex(
    (row) =>
      row.id === current?.id ||
      (isNavGroup(row) &&
        !open.has(row.id) &&
        isNavOptionCurrent(row, current)),
  );
}

const BUILT_IN_ICONS: Record<string, LucideIcon> = {
  home: Home,
  posts: BookOpen,
  moments: MessageCircle,
  "friend-links": Link2,
};

/**
 * The icon that leads an entry in the rail. The built-in entries each have
 * their own; a custom link gets one by where it leads: another site, a
 * Post, or anywhere else on this one.
 */
export function entryIcon(option: NavLinkOption): LucideIcon {
  const builtIn = BUILT_IN_ICONS[option.id];
  if (builtIn) return builtIn;
  if (option.external) return Globe;
  return normaliseNavPath(option.href).startsWith("/post/")
    ? FileText
    : Compass;
}

/** The icon that leads a group in the rail. */
export const GROUP_ICON: LucideIcon = Folder;
