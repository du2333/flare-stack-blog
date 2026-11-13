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
function normalisePath(href: string) {
  let path = href.split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // Not an encoded path: compare it as it is written.
  }
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Whether a navigation entry is the page at `pathname`: a link when the page
 * is its address or lies under it (the home link only on the home page), the
 * rule the router's own links mark themselves by; a group when any of its
 * links is. An external link never is.
 */
export function isNavOptionCurrent(
  option: NavOption,
  pathname: string,
): boolean {
  if (isNavGroup(option))
    return option.children.some((child) => isNavOptionCurrent(child, pathname));
  if (option.external) return false;
  const href = normalisePath(option.href);
  const path = normalisePath(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
