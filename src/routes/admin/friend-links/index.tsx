import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AddFriendLinkModal } from "@/features/friend-links/components/admin/add-friend-link-modal";
import { FriendLinkModerationTable } from "@/features/friend-links/components/admin/friend-link-moderation-table";
import type { FriendLinkStatus } from "@/lib/db/schema";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "ALL"])
    .optional()
    .default("pending")
    .catch("pending"),
  page: z.number().optional().default(1).catch(1),
});

export const Route = createFileRoute("/admin/friend-links/")({
  ssr: false,
  validateSearch: searchSchema,
  component: FriendLinksAdminPage,
  loader: () => {
    return {
      title: m.friend_links_admin_title(),
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

function FriendLinksAdminPage() {
  const { status, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: newStatus as FriendLinkStatus | "ALL",
        page: 1,
      }),
    });
  };

  const currentStatus: FriendLinkStatus | undefined =
    status === "ALL" ? undefined : status;

  const tabs = [
    { key: "pending", label: m.friend_links_tab_pending() },
    { key: "approved", label: m.friend_links_tab_approved() },
    { key: "rejected", label: m.friend_links_tab_rejected() },
    { key: "ALL", label: m.friend_links_tab_all() },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.friend_links_admin_title()}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              {m.friend_links_admin_tag()}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest h-9 px-4"
        >
          <Plus size={14} className="mr-2" />
          {m.friend_links_add_btn()}
        </Button>
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

        {/* Content Area */}
        <div className="min-h-100">
          <FriendLinkModerationTable status={currentStatus} page={page} />
        </div>
      </div>

      {/* Add Friend Link Modal */}
      <AddFriendLinkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
