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
import type { NavLinkOption } from "@/components/layout/layout-props";
import {
  currentNavLink,
  normaliseNavPath,
} from "@/components/layout/nav-options";

/**
 * The index of the entry the page at `pathname` belongs to, or -1 when none
 * does, by the shared rule (`currentNavLink`).
 */
export function currentEntryIndex(
  navOptions: ReadonlyArray<NavLinkOption>,
  pathname: string,
): number {
  const current = currentNavLink(navOptions, pathname);
  return current ? navOptions.indexOf(current) : -1;
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
