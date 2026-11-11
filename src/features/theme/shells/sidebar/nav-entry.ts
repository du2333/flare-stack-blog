import {
  BookOpen,
  Compass,
  FileText,
  Globe,
  Home,
  Link2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { NavOption } from "@/components/layout/layout-props";

/** A path without its query, hash and trailing slash, decoded. */
function normalise(href: string) {
  let path = href.split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // Not an encoded path: compare it as it is written.
  }
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Which navigation entry the page at `pathname` belongs to, or -1 when none
 * does: the entry whose address is the page's or leads to it, the longest
 * such address winning, so a custom link to a Post beats the Post list. A
 * Post no entry points at belongs to the Post list. An external entry is
 * never current.
 */
export function currentEntryIndex(
  navOptions: ReadonlyArray<NavOption>,
  pathname: string,
): number {
  const path = normalise(pathname);
  let current = -1;
  let longest = -1;
  navOptions.forEach((option, index) => {
    if (option.external) return;
    const href = normalise(option.href);
    const leadsHere =
      href === "/"
        ? path === "/"
        : path === href || path.startsWith(`${href}/`);
    if (leadsHere && href.length > longest) {
      current = index;
      longest = href.length;
    }
  });
  if (current < 0 && path.startsWith("/post/")) {
    return navOptions.findIndex(
      (option) => !option.external && normalise(option.href) === "/posts",
    );
  }
  return current;
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
export function entryIcon(option: NavOption): LucideIcon {
  const builtIn = BUILT_IN_ICONS[option.id];
  if (builtIn) return builtIn;
  if (option.external) return Globe;
  return normalise(option.href).startsWith("/post/") ? FileText : Compass;
}
