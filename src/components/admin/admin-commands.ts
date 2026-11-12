import type { useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  Bot,
  FileText,
  KeyRound,
  Moon,
  PenLine,
  Plus,
  Sun,
  Wrench,
} from "lucide-react";
import type { Command } from "@/components/ui/command-palette";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { ADMIN_NAV } from "./admin-nav";

const untitled = (title: string) => title.trim() || m.common_untitled();

/**
 * What ⌘K offers, in this order: continue the latest draft and start a new
 * Post; every page of the sidebar and the settings sections people look
 * for by name; the Posts last edited; the colour scheme and the site.
 * `overview` is the overview's query, when it is in the cache.
 */
export function adminCommands({
  overview,
  navigate,
  createPost,
  colourScheme,
  setColourScheme,
}: {
  overview: DashboardOverview | undefined;
  navigate: ReturnType<typeof useNavigate>;
  createPost: () => void;
  colourScheme: "light" | "dark";
  setColourScheme: (scheme: "light" | "dark") => void;
}): Array<Command> {
  const go = (to: string) => () => void navigate({ to });
  const write = m.admin_palette_group_write();
  const goTo = m.admin_palette_group_go();
  const commands: Array<Command> = [];

  const draft = overview?.latestDraft;
  if (draft)
    commands.push({
      id: "continue",
      group: write,
      label: m.admin_palette_continue({ title: untitled(draft.title) }),
      keywords: "continue draft 草稿",
      icon: PenLine,
      run: go(`/admin/posts/edit/${draft.id}`),
    });
  commands.push({
    id: "new",
    group: write,
    label: m.admin_posts_create(),
    keywords: "new post create 写",
    icon: Plus,
    run: createPost,
  });

  for (const group of ADMIN_NAV)
    for (const item of group.items)
      commands.push({
        id: `nav-${item.id}`,
        group: goTo,
        label: item.label(),
        hint: group.label?.(),
        keywords: item.id,
        icon: item.icon,
        run: go(item.to),
      });
  commands.push(
    {
      id: "nav-notifications",
      group: goTo,
      label: m.settings_nav_notify(),
      hint: m.admin_layout_settings(),
      keywords: "notifications email webhook",
      icon: Bell,
      run: go("/admin/settings/notifications"),
    },
    {
      id: "nav-maintenance",
      group: goTo,
      label: m.settings_nav_maintenance(),
      hint: m.admin_layout_settings(),
      keywords: "maintenance cache 缓存",
      icon: Wrench,
      run: go("/admin/settings/maintenance"),
    },
    {
      id: "nav-api-keys",
      group: goTo,
      label: m.settings_nav_api_keys(),
      hint: m.admin_sidebar_access(),
      keywords: "api key token",
      icon: KeyRound,
      run: go("/admin/access/api-keys"),
    },
    {
      id: "nav-agent",
      group: goTo,
      label: m.settings_nav_agent_skill(),
      hint: m.admin_sidebar_access(),
      keywords: "agent skill ai",
      icon: Bot,
      run: go("/admin/access/agent-skill"),
    },
  );

  for (const post of overview?.recentPosts ?? [])
    commands.push({
      id: `post-${post.id}`,
      group: m.dashboard_recent_edits(),
      label: untitled(post.title),
      hint: post.status === "draft" ? m.admin_posts_status_draft() : undefined,
      icon: FileText,
      run: go(`/admin/posts/edit/${post.id}`),
    });

  const other = m.admin_palette_group_other();
  const dark = colourScheme === "dark";
  commands.push(
    {
      id: "scheme",
      group: other,
      label: dark
        ? m.admin_palette_scheme_light()
        : m.admin_palette_scheme_dark(),
      keywords: "theme dark light 主题 明暗",
      icon: dark ? Sun : Moon,
      run: () => setColourScheme(dark ? "light" : "dark"),
    },
    {
      id: "site",
      group: other,
      label: m.admin_palette_view_site(),
      keywords: "site home 前台 博客",
      icon: ArrowUpRight,
      run: () => window.open("/", "_blank", "noopener"),
    },
  );
  return commands;
}
