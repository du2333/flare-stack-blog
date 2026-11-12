import {
  FileText,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Palette,
  Settings,
  Tags,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { m } from "@/paraglide/messages";
import type { FileRoutesByTo } from "@/routeTree.gen";

/** Pending work a sidebar entry counts (admin-counts.ts). */
export type AdminNavCount = "comments" | "friendLinks";

export interface AdminNavItem {
  id: string;
  to: keyof FileRoutesByTo;
  /** Paths under this prefix mark the entry current. */
  prefix: string;
  label: () => string;
  icon: LucideIcon;
  count?: AdminNavCount;
}

export interface AdminNavGroup {
  id: string;
  /** Unnamed for the overview, which stands alone. */
  label?: () => string;
  items: Array<AdminNavItem>;
}

/** The sidebar, grouped by what there is to do (spec #298). */
export const ADMIN_NAV: ReadonlyArray<AdminNavGroup> = [
  {
    id: "overview",
    items: [
      {
        id: "overview",
        to: "/admin",
        prefix: "/admin",
        label: () => m.admin_sidebar_dashboard(),
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "content",
    label: () => m.admin_sidebar_group_content(),
    items: [
      {
        id: "posts",
        to: "/admin/posts",
        prefix: "/admin/posts",
        label: () => m.admin_sidebar_posts(),
        icon: FileText,
      },
      {
        id: "media",
        to: "/admin/media",
        prefix: "/admin/media",
        label: () => m.admin_sidebar_media(),
        icon: ImageIcon,
      },
      {
        id: "taxonomy",
        to: "/admin/taxonomy",
        prefix: "/admin/taxonomy",
        label: () => m.admin_sidebar_taxonomy(),
        icon: Tags,
      },
    ],
  },
  {
    id: "engagement",
    label: () => m.admin_sidebar_group_engagement(),
    items: [
      {
        id: "comments",
        to: "/admin/comments",
        prefix: "/admin/comments",
        label: () => m.admin_sidebar_comments(),
        icon: MessageSquare,
        count: "comments",
      },
      {
        id: "friend-links",
        to: "/admin/friend-links",
        prefix: "/admin/friend-links",
        label: () => m.admin_sidebar_friend_links(),
        icon: Link2,
        count: "friendLinks",
      },
      {
        id: "muted-users",
        to: "/admin/muted-users",
        prefix: "/admin/muted-users",
        label: () => m.muted_users_title(),
        icon: VolumeX,
      },
    ],
  },
  {
    id: "site",
    label: () => m.admin_sidebar_group_site(),
    items: [
      {
        id: "personalize",
        to: "/admin/personalize",
        prefix: "/admin/personalize",
        label: () => m.admin_sidebar_personalize(),
        icon: Palette,
      },
      {
        id: "access",
        to: "/admin/access/api-keys",
        prefix: "/admin/access",
        label: () => m.admin_sidebar_access(),
        icon: KeyRound,
      },
      {
        id: "settings",
        to: "/admin/settings/site",
        prefix: "/admin/settings",
        label: () => m.admin_layout_settings(),
        icon: Settings,
      },
    ],
  },
];

/** The entry for `pathname`: the one with the longest matching prefix. */
export function currentNavItem(pathname: string): AdminNavItem | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: AdminNavItem | undefined;
  for (const group of ADMIN_NAV)
    for (const item of group.items) {
      const matches =
        path === item.prefix || path.startsWith(`${item.prefix}/`);
      if (matches && (!best || item.prefix.length > best.prefix.length))
        best = item;
    }
  return best;
}
