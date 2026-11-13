export const NAV_LINKS_MAX = 5;
/** How many links one group holds. */
export const NAV_LINK_CHILDREN_MAX = 6;
export const NAV_LINK_LABEL_MAX = 20;

/** A custom link that leads somewhere: a root-relative path or an http(s) URL. */
export type NavLinkItem = {
  label: string;
  href: string;
};

/**
 * A group of custom links under a name. It leads nowhere itself, and its
 * links hold no links of their own: the menu has one level.
 */
export type NavLinkGroup = {
  label: string;
  children: Array<NavLinkItem>;
};

/** One custom link of Site Config, as it is read: a link or a group. */
export type NavLink = NavLinkItem | NavLinkGroup;

/** Whether a custom link read from Site Config is a group. */
export function isNavLinkGroup(link: NavLink): link is NavLinkGroup {
  return "children" in link;
}

export function isExternalNavHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isInternalNavHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function isNavHref(href: string): boolean {
  return isInternalNavHref(href) || isExternalNavHref(href);
}

function looksLikeHost(value: string): boolean {
  if (!value || value.includes(" ") || value.includes("://")) return false;
  if (value.startsWith(".") || value.startsWith("/")) return false;
  if (/^localhost([:/?#]|$)/i.test(value)) return true;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([:/?#]|$)/i.test(
    value,
  );
}

export function canonicalizeNavHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (isInternalNavHref(trimmed) || isExternalNavHref(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (looksLikeHost(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function readLabel(record: { label?: unknown }): string {
  const label = typeof record.label === "string" ? record.label.trim() : "";
  return label.slice(0, NAV_LINK_LABEL_MAX);
}

/** A stored link with a name and a usable address, or null. */
function readLinkItem(item: unknown): NavLinkItem | null {
  if (!item || typeof item !== "object") return null;
  const record = item as { label?: unknown; href?: unknown };
  const label = readLabel(record);
  const href = canonicalizeNavHref(
    typeof record.href === "string" ? record.href : "",
  );
  if (!label || !isNavHref(href)) return null;
  return { label, href };
}

/**
 * The custom links of a stored Site Config, as the navigation shows them.
 * An entry whose `children` keep at least one usable link is a group, and
 * its own address is dropped; any other entry needs a usable address. The
 * links past the limit of a group, and whatever a child nests, are dropped.
 * A config saved before groups existed reads as it was.
 */
export function normalizeNavLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];

  const links: NavLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { label?: unknown; children?: unknown };
    const children = Array.isArray(record.children)
      ? record.children
          .map(readLinkItem)
          .filter((child) => child !== null)
          .slice(0, NAV_LINK_CHILDREN_MAX)
      : [];
    let link: NavLink | null = readLinkItem(item);
    if (children.length > 0) {
      const label = readLabel(record);
      link = label ? { label, children } : null;
    }
    if (!link) continue;
    links.push(link);
    if (links.length >= NAV_LINKS_MAX) break;
  }
  return links;
}
