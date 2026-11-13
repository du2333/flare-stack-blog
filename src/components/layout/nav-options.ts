import type {
  NavGroupOption,
  NavLinkOption,
  NavOption,
} from "@/components/layout/layout-props";
import {
  isExternalNavHref,
  isNavLinkGroup,
  type NavLink,
  type NavLinkItem,
} from "@/features/config/utils/nav-links";

/**
 * The navigation entries of the custom links in Site Config: `custom-<i>`
 * for the i-th entry, `custom-<i>-<j>` for the j-th link of a group.
 */
export function customNavOptions(
  links: ReadonlyArray<NavLink>,
): Array<NavOption> {
  const toOption = (link: NavLinkItem, id: string): NavLinkOption => ({
    id,
    label: link.label,
    href: link.href,
    external: isExternalNavHref(link.href),
  });
  return links.map((link, index) =>
    isNavLinkGroup(link)
      ? {
          id: `custom-${index}`,
          label: link.label,
          children: link.children.map((child, childIndex) =>
            toOption(child, `custom-${index}-${childIndex}`),
          ),
        }
      : toOption(link, `custom-${index}`),
  );
}

/** Whether a navigation entry is a group of links rather than a link. */
export function isNavGroup(option: NavOption): option is NavGroupOption {
  return option.children !== undefined;
}

/**
 * The navigation as a list of links, for a place that shows no groups (the
 * footer, a compact list): each group gives way to its links, in order.
 */
export function flattenNavOptions(
  navOptions: ReadonlyArray<NavOption>,
): Array<NavLinkOption> {
  return navOptions.flatMap((option) =>
    isNavGroup(option) ? option.children : [option],
  );
}

/** A path without its query, hash and trailing slash, decoded. */
export function normaliseNavPath(href: string) {
  let path = href.split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // Not an encoded path: compare it as it is written.
  }
  return path.replace(/\/+$/, "") || "/";
}

/**
 * The one link of the navigation that the page at `pathname` belongs to, or
 * null: the link whose address is the page's or leads to it (the home link
 * on the home page only), the longest such address winning, so a link to a
 * Post beats the Post list and a group's `/posts/x` beats `/posts`. A Post no
 * link points at belongs to the Post list. An external link never is.
 */
export function currentNavLink(
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): NavLinkOption | null {
  const links = flattenNavOptions(navOptions).filter(
    (option) => !option.external,
  );
  const path = normaliseNavPath(pathname);
  let current: NavLinkOption | null = null;
  let longest = -1;
  for (const option of links) {
    const href = normaliseNavPath(option.href);
    const leadsHere =
      href === "/"
        ? path === "/"
        : path === href || path.startsWith(`${href}/`);
    if (leadsHere && href.length > longest) {
      current = option;
      longest = href.length;
    }
  }
  if (!current && path.startsWith("/post/")) {
    current =
      links.find((option) => normaliseNavPath(option.href) === "/posts") ??
      null;
  }
  return current;
}

/**
 * Whether a navigation entry is current, given the navigation's current link
 * (`currentNavLink`): a link when it is that link, a group when it holds it.
 */
export function isNavOptionCurrent(
  option: NavOption,
  current: NavLinkOption | null,
): boolean {
  if (!current) return false;
  if (isNavGroup(option))
    return option.children.some((child) => child.id === current.id);
  return option.id === current.id;
}
