import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mail,
  Search,
  Shield,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Input } from "@/components/ui/input";
import { userListQueryOptions } from "@/features/auth/queries";

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional().default(1).catch(1),
});

export const Route = createFileRoute("/admin/users/")({
  validateSearch: searchSchema,
  component: UsersAdminPage,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(userListQueryOptions(1));
    return { title: "用户管理" };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function UsersAdminPage() {
  const { search, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search || "");

  const { data } = useSuspenseQuery(
    userListQueryOptions(page, search),
  );

  const { items: users, total } = data;
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  // 搜索去抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        navigate({
          search: (prev) => ({
            ...prev,
            search: searchInput || undefined,
            page: 1,
          }),
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, navigate, search]);

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({ ...prev, page: newPage }),
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* 标题栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            用户管理
          </h1>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            USER_MANAGEMENT · {total} users
          </p>
        </div>

        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 transition-colors group-focus-within:text-foreground" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 border-b border-border/50 bg-transparent rounded-none font-mono text-xs focus:border-foreground transition-all"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="min-h-100">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UserIcon
              size={32}
              className="text-muted-foreground/30 mb-4"
            />
            <p className="text-sm text-muted-foreground">
              {search ? "没有找到匹配的用户" : "暂无注册用户"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 表头 */}
            <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.6fr_0.8fr_0.5fr] gap-4 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/30">
              <span>用户</span>
              <span>邮箱</span>
              <span>角色</span>
              <span>注册时间</span>
              <span>状态</span>
            </div>

            {/* 用户行 */}
            {users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_0.6fr_0.8fr_0.5fr] gap-2 md:gap-4 px-4 py-3 border-b border-border/10 hover:bg-muted/30 transition-colors group"
              >
                {/* 用户信息 */}
                <div className="flex items-center gap-3 min-w-0">
                  {u.image ? (
                    <img
                      src={u.image}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/30">
                      <UserIcon size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">
                    {u.name}
                  </span>
                </div>

                {/* 邮箱 */}
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={12} className="text-muted-foreground shrink-0 hidden md:block" />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {u.email}
                  </span>
                  {u.emailVerified && (
                    <span className="text-[9px] font-mono text-emerald-500 uppercase shrink-0">
                      verified
                    </span>
                  )}
                </div>

                {/* 角色 */}
                <div className="flex items-center gap-1.5">
                  {u.role === "admin" ? (
                    <>
                      <Shield size={12} className="text-amber-500" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500">
                        Admin
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      User
                    </span>
                  )}
                </div>

                {/* 注册时间 */}
                <div className="flex items-center">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </span>
                </div>

                {/* 状态 */}
                <div className="flex items-center">
                  {u.banned ? (
                    <div className="flex items-center gap-1">
                      <ShieldAlert size={12} className="text-red-500" />
                      <span className="text-[10px] font-mono uppercase text-red-500">
                        Banned
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-emerald-500">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      <AdminPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={itemsPerPage}
        currentPageItemCount={users.length}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
