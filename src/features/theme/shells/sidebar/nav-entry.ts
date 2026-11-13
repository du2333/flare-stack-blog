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
 * The groups that start open: the ones that hold the link the page at
 * `pathname` belongs to, by the shared rule (`currentNavLink`).
 */
export function defaultOpenGroups(
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): Set<string> {
  const current = currentNavLink(navOptions, pathname);
  return new Set(
    navOptions
      .filter(
        (option) => isNavGroup(option) && isNavOptionCurrent(option, current),
      )
      .map((option) => option.id),
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
