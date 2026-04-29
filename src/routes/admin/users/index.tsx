import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Search,
  ShieldCheck,
  User,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { useUpdateUserRole } from "@/features/users/hooks/use-update-user-role";
import { usersListQuery } from "@/features/users/queries";
import type { UserItem } from "@/features/users/users.schema";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const ROW_HEIGHT = 64;
const OVERSCAN = 5;

const SearchSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["user", "admin", "all"]).optional(),
});

export const Route = createFileRoute("/admin/users/")({
  ssr: false,
  component: UsersManagement,
  validateSearch: (search) => SearchSchema.parse(search),
  loader: () => ({
    title: m.admin_users_title(),
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function UsersManagement() {
  const { search = "", role = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: localSearch || undefined,
        }),
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch, navigate]);

  const { data, isLoading } = useQuery(
    usersListQuery({
      limit: 500,
      search: search || undefined,
      role: role === "all" ? undefined : role,
    }),
  );

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-300 mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.admin_users_heading()}
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            {m.admin_users_total({ count: total })}
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={m.admin_users_search_placeholder()}
            className="w-full h-10 pl-9 pr-4 bg-transparent border border-border/30 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* Role filter */}
        <div className="flex gap-2">
          {(["all", "user", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, role: r === "all" ? undefined : r }),
                })
              }
              className={cn(
                "px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-colors",
                (role ?? "all") === r
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground border-border/30 hover:text-foreground hover:border-foreground/30",
              )}
            >
              {r === "all"
                ? m.admin_users_filter_all()
                : r === "admin"
                  ? m.admin_users_filter_admin()
                  : m.admin_users_filter_user()}
            </button>
          ))}
        </div>
      </div>

      {/* Virtual scroll list */}
      {isLoading ? (
        <UserListSkeleton />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <UsersRound size={32} className="opacity-20" />
          <p className="text-[10px] font-mono uppercase tracking-widest">
            {m.admin_users_no_match()}
          </p>
        </div>
      ) : (
        <VirtualUserList users={users} />
      )}
    </div>
  );
}

function UserListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-16 border border-border/20 bg-muted/10 animate-pulse"
        />
      ))}
    </div>
  );
}

function VirtualUserList({ users }: { users: UserItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = users.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    users.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleUsers = useMemo(
    () => users.slice(startIndex, endIndex),
    [users, startIndex, endIndex],
  );

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-400px)] min-h-80 overflow-y-auto custom-scrollbar border border-border/20"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleUsers.map((user, i) => (
          <UserRow
            key={user.id}
            user={user}
            style={{
              position: "absolute",
              top: (startIndex + i) * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  style,
}: {
  user: UserItem;
  style: React.CSSProperties;
}) {
  const { updateRole, isUpdating } = useUpdateUserRole();

  const isAdmin = user.role === "admin";
  const displayRole = isAdmin
    ? m.admin_sidebar_role_admin()
    : m.admin_sidebar_role_user();

  return (
    <div
      style={style}
      className="flex items-center gap-4 px-4 md:px-6 border-b border-border/10 hover:bg-muted/20 transition-colors group"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full border border-border/30 flex items-center justify-center bg-muted/20 shrink-0 overflow-hidden">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={16} className="text-muted-foreground/50" />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-40">
            {user.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-sm",
              isAdmin
                ? "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                : "bg-muted/40 text-muted-foreground",
            )}
          >
            {isAdmin ? (
              <ShieldCheck size={10} />
            ) : (
              <User size={10} />
            )}
            {displayRole}
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground truncate max-w-60">
          {user.email}
        </p>
      </div>

      {/* Created at (hidden on mobile) */}
      <div className="hidden md:block text-[10px] font-mono text-muted-foreground/60 shrink-0 w-24 text-right">
        {formatDate(user.createdAt)}
      </div>

      {/* Action button */}
      <div className="shrink-0">
        {isAdmin ? (
          <button
            onClick={() =>
              updateRole({ userId: user.id, role: "user" })
            }
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
            title={m.admin_users_action_demote()}
          >
            <ChevronDown size={12} />
            {m.admin_users_action_demote()}
          </button>
        ) : (
          <button
            onClick={() =>
              updateRole({ userId: user.id, role: "admin" })
            }
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            title={m.admin_users_action_promote()}
          >
            <ChevronUp size={12} />
            {m.admin_users_action_promote()}
          </button>
        )}
      </div>
    </div>
  );
}
