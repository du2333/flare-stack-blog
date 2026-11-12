// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  Bot,
  CornerDownLeft,
  FileText,
  KeyRound,
  type LucideIcon,
  Moon,
  PenLine,
  Plus,
  Search,
  Sun,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  run: () => void;
}

/**
 * ⌘K: go anywhere, start writing, reopen a Post. Filters by what is typed;
 * arrows move, Enter runs, Escape closes.
 */
export function CommandPalette({
  onClose,
  onCreatePost,
}: {
  onClose: () => void;
  onCreatePost: () => void;
}) {
  const navigate = useNavigate();
  const { colourScheme, setColourScheme } = useColourScheme();
  const { data } = useQuery(dashboardOverviewQuery);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    const go = (to: string) => () => void navigate({ to });
    const list: Array<Command> = [];
    if (data?.latestDraft) {
      const draft = data.latestDraft;
      list.push({
        id: "continue",
        group: "写作",
        label: `继续写「${draft.title.trim() || "无标题"}」`,
        keywords: "continue draft 草稿",
        icon: PenLine,
        run: go(`/admin/posts/edit/${draft.id}`),
      });
    }
    list.push({
      id: "new",
      group: "写作",
      label: "新建文章",
      keywords: "new post create 写",
      icon: Plus,
      run: onCreatePost,
    });
    for (const group of ADMIN_NAV)
      for (const item of group.items)
        list.push({
          id: `nav-${item.id}`,
          group: "前往",
          label: item.label(),
          hint: group.label?.(),
          keywords: item.id,
          icon: item.icon,
          run: go(item.to),
        });
    list.push(
      {
        id: "nav-notifications",
        group: "前往",
        label: "通知",
        hint: "设置",
        keywords: "notifications email webhook",
        icon: Bell,
        run: go("/admin/settings/notifications"),
      },
      {
        id: "nav-maintenance",
        group: "前往",
        label: "维护",
        hint: "设置",
        keywords: "maintenance cache 缓存",
        icon: Wrench,
        run: go("/admin/settings/maintenance"),
      },
      {
        id: "nav-api-keys",
        group: "前往",
        label: "API Key",
        hint: "接入",
        keywords: "api key token",
        icon: KeyRound,
        run: go("/admin/access/api-keys"),
      },
      {
        id: "nav-agent",
        group: "前往",
        label: "Agent Skill",
        hint: "接入",
        keywords: "agent skill ai",
        icon: Bot,
        run: go("/admin/access/agent-skill"),
      },
    );
    for (const post of data?.recentPosts ?? [])
      list.push({
        id: `post-${post.id}`,
        group: "最近编辑",
        label: post.title.trim() || "无标题",
        hint: post.status === "draft" ? "草稿" : undefined,
        icon: FileText,
        run: go(`/admin/posts/edit/${post.id}`),
      });
    list.push(
      {
        id: "scheme",
        group: "其他",
        label: colourScheme === "dark" ? "切换到浅色" : "切换到深色",
        keywords: "theme dark light 主题 明暗",
        icon: colourScheme === "dark" ? Sun : Moon,
        run: () => setColourScheme(colourScheme === "dark" ? "light" : "dark"),
      },
      {
        id: "site",
        group: "其他",
        label: "查看站点",
        keywords: "site home 前台 博客",
        icon: ArrowUpRight,
        run: () => window.open("/", "_blank", "noopener"),
      },
    );
    return list;
  }, [data, navigate, onCreatePost, colourScheme, setColourScheme]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint ?? ""} ${command.keywords ?? ""}`
        .toLowerCase()
        .includes(text),
    );
  }, [commands, query]);
  const index = Math.min(active, Math.max(shown.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [index, shown]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  let lastGroup = "";
  return createPortal(
    <div
      className="st-cmdk-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="st-cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="搜索与跳转"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index + 1) % Math.max(shown.length, 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(
              (index - 1 + Math.max(shown.length, 1)) %
                Math.max(shown.length, 1),
            );
          } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            run(shown[index]);
          }
        }}
      >
        <div className="st-cmdk-field">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            placeholder="搜索页面、文章或操作…"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <kbd className="admin-kbd">esc</kbd>
        </div>
        <div ref={listRef} className="st-cmdk-list" role="listbox">
          {shown.length === 0 ? (
            <p className="st-cmdk-empty">没有匹配「{query}」的结果</p>
          ) : (
            shown.map((command, position) => {
              const heading =
                command.group !== lastGroup ? (
                  <div className="st-cmdk-group">{command.group}</div>
                ) : null;
              lastGroup = command.group;
              return (
                <div key={command.id}>
                  {heading}
                  <button
                    type="button"
                    role="option"
                    aria-selected={position === index}
                    data-active={position === index ? "" : undefined}
                    className="st-cmdk-item"
                    onMouseMove={() => setActive(position)}
                    onClick={() => run(command)}
                  >
                    <command.icon size={16} strokeWidth={1.7} />
                    <span>{command.label}</span>
                    {command.hint ? <small>{command.hint}</small> : null}
                    <CornerDownLeft size={14} className="st-cmdk-enter" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="st-cmdk-foot">
          <span>
            <kbd className="admin-kbd">↑</kbd>
            <kbd className="admin-kbd">↓</kbd>
            选择
          </span>
          <span>
            <kbd className="admin-kbd">↵</kbd>
            打开
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
