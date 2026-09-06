export const NAV_LINKS_MAX = 5;
export const NAV_LINK_LABEL_MAX = 20;

export type NavLink = {
  label: string;
  href: string;
};

export function isExternalNavHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isInternalNavHref(href: string): boolean {
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

export function normalizeNavLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];

  const links: NavLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { label?: unknown; href?: unknown };
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const href = canonicalizeNavHref(
      typeof record.href === "string" ? record.href : "",
    );
    if (!label || !isNavHref(href)) continue;
    links.push({
      label: label.slice(0, NAV_LINK_LABEL_MAX),
      href,
    });
    if (links.length >= NAV_LINKS_MAX) break;
  }
  return links;
}
