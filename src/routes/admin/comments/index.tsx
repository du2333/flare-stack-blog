import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { CommentModerationTable } from "@/features/comments/components/admin/comment-moderation-table";
import type { CommentStatus } from "@/lib/db/schema";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  status: z
    .enum(["pending", "published", "deleted", "verifying", "ALL"])
    .optional()
    .default("pending")
    .catch("pending"),
  userName: z.string().optional(),
  page: z.number().optional().default(1).catch(1),
});

export const Route = createFileRoute("/admin/comments/")({
  ssr: false,
  validateSearch: searchSchema,
  component: CommentAdminPage,
  loader: () => {
    return {
      title: m.comments_admin_title(),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function CommentAdminPage() {
  const { status, userName, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(userName || "");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== userName) {
        navigate({
          search: (prev) => ({
            ...prev,
            userName: searchInput || undefined,
            page: 1, // Reset page on search
          }),
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, navigate, userName]);

  const handleStatusChange = (newStatus: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: newStatus as CommentStatus | "ALL",
        page: 1,
      }),
    });
  };

  const currentStatus: CommentStatus | undefined =
    status === "ALL" ? undefined : status;
  const tabs = [
    { key: "pending", label: m.comments_tab_pending() },
    { key: "published", label: m.comments_tab_published() },
    { key: "deleted", label: m.comments_tab_deleted() },
    { key: "ALL", label: m.comments_tab_all() },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.comments_admin_title()}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              {m.comments_admin_tag()}
            </p>
          </div>
        </div>

        {/* User Search */}
        <div className="relative w-full md:w-64 group">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 transition-colors group-focus-within:text-foreground" />
          <Input
            placeholder={m.comments_admin_search()}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 border-b border-border/50 bg-transparent rounded-none font-mono text-xs focus:border-foreground transition-all"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* Navigation & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <nav className="flex items-center gap-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`
                  relative text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap font-mono
                  ${
                    status === tab.key
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {status === tab.key ? `[ ${tab.label} ]` : tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area - Minimal background, focus on content */}
        <div className="min-h-100">
          <CommentModerationTable
            status={currentStatus}
            userName={userName}
            page={page}
          />
        </div>
      </div>
    </div>
  );
}
