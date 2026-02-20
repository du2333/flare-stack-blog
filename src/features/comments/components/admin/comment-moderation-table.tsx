import { Link, RouteApi } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, MessageSquareOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { COMMENTS_KEYS, allCommentsQuery } from "../../queries";
import { useAdminComments } from "../../hooks/use-comments";

import { CommentModerationActions } from "./comment-moderation-actions";
import { UserHoverCard } from "./user-hover-card";
import type { JSONContent } from "@tiptap/react";
import type { CommentStatus } from "@/lib/db/schema";
import { ExpandableContent } from "@/features/theme/themes/default/components/comments/view/expandable-content";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { formatDate } from "@/lib/utils";

interface CommentModerationTableProps {
  status?: CommentStatus;
  postId?: number;
  userName?: string;
  page?: number;
}

const PAGE_SIZE = 20;
const routeApi = new RouteApi({ id: "/admin/comments/" });

export const CommentModerationTable = ({
  status,
  postId,
  userName,
  page = 1,
}: CommentModerationTableProps) => {
  const navigate = routeApi.useNavigate();
  const { data: response, isLoading } = useQuery(
    allCommentsQuery({
      status,
      postId,
      userId: undefined, // userId is replaced by userName search
      userName,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { moderate } = useAdminComments();
  const queryClient = useQueryClient();

  const handleSelectAll = () => {
    if (!response) return;
    if (selectedIds.size === response.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(response.items.map((item) => item.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    const toastId = toast.loading(`正在批准 ${selectedIds.size} 条评论...`);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          moderate({ data: { id, status: "published" } }),
        ),
      );
      toast.success("批量批准完成", { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
    } catch (error) {
      toast.error("部分操作失败", { id: toastId });
    }
  };

  const handleBatchTrash = async () => {
    if (selectedIds.size === 0) return;
    const toastId = toast.loading(
      `正在移入垃圾箱 ${selectedIds.size} 条评论...`,
    );
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          moderate({ data: { id, status: "deleted" } }),
        ),
      );
      toast.success("已移入垃圾箱", { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
    } catch (error) {
      toast.error("部分操作失败", { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!response || response.items.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground font-serif italic gap-4 border-t border-border">
        <MessageSquareOff size={40} strokeWidth={1} className="opacity-20" />
        <p>未找到匹配的评论</p>
      </div>
    );
  }

  const allSelected =
    response.items.length > 0 && selectedIds.size === response.items.length;
  const totalPages = Math.ceil(response.total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Batch Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-40 flex items-center justify-between p-4 bg-background border border-border/30 shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em]">
              已选 / {selectedIds.size}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              [ 取消 ]
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleBatchApprove}
              className="h-8 px-4 rounded-none bg-foreground text-background hover:bg-foreground/90 transition-all font-mono text-[10px] uppercase tracking-widest"
            >
              [ 批量批准 ]
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchTrash}
              className="h-8 px-4 rounded-none border-border/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-mono text-[10px] uppercase tracking-widest"
            >
              [ 移入垃圾箱 ]
            </Button>
          </div>
        </div>
      )}

      {/* List Header (Desktop) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border/30 items-center bg-muted/5">
        <div className="col-span-1 flex justify-center">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="rounded-none border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
          />
        </div>
        <div className="col-span-2 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          作者
        </div>
        <div className="col-span-1"></div>
        <div className="col-span-5 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          内容 / 上下文
        </div>
        <div className="col-span-1 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          状态
        </div>
        <div className="col-span-2 text-right text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          操作
        </div>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-border/30">
        {response.items.map((comment) => (
          <div
            key={comment.id}
            className={`
              group transition-all duration-500
              ${selectedIds.has(comment.id) ? "bg-muted/30" : "hover:bg-muted/10"}
            `}
          >
            {/* Desktop Item */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-6 items-start hover:bg-accent/5 transition-colors">
              <div className="col-span-1 flex justify-center pt-1">
                <Checkbox
                  checked={selectedIds.has(comment.id)}
                  onCheckedChange={() => handleSelectOne(comment.id)}
                  className="rounded-none border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                />
              </div>

              {/* Author Info */}
              <div className="col-span-2 space-y-3">
                <UserHoverCard
                  user={{
                    id: comment.userId,
                    name: comment.user?.name || "Unknown",
                    image: comment.user?.image || null,
                  }}
                >
                  <div className="flex items-center gap-3 cursor-pointer group/user overflow-hidden">
                    <div className="w-8 h-8 rounded-none bg-muted/20 flex items-center justify-center border border-border/30 shrink-0">
                      {comment.user?.image ? (
                        <img
                          src={comment.user.image}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-mono">
                          {comment.user?.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-serif font-medium truncate group-hover/user:text-foreground transition-colors">
                        {comment.user?.name}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        {formatDate(comment.createdAt).split(" ")[0]}
                      </div>
                    </div>
                  </div>
                </UserHoverCard>
              </div>

              <div className="col-span-1"></div>

              {/* Content & Context */}
              <div className="col-span-5 space-y-4">
                <div className="relative">
                  <ExpandableContent
                    content={comment.content as JSONContent}
                    maxLines={3}
                    className="text-sm font-serif leading-relaxed text-foreground/80 tracking-wide"
                  />
                </div>

                {/* Context & Meta */}
                <div className="flex flex-col gap-2 border-l border-border/50 pl-4 py-1">
                  {comment.post && (
                    <Link
                      to="/post/$slug"
                      params={{ slug: comment.post.slug || "" }}
                      hash={`comment-${comment.id}`}
                      search={{
                        highlightCommentId: comment.id,
                        rootId: comment.rootId || undefined,
                      }}
                      className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group/post"
                    >
                      <span className="opacity-30 group-hover/post:opacity-100 transition-opacity">
                        跳至评论 /
                      </span>
                      <span className="truncate max-w-50">
                        {comment.post.title}
                      </span>
                    </Link>
                  )}
                  {comment.replyToUser && (
                    <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                      <span className="opacity-30">回复 /</span>
                      <span>@{comment.replyToUser.name}</span>
                    </div>
                  )}
                  {comment.aiReason && (
                    <div className="text-[10px] font-mono text-orange-500 flex items-center gap-2 px-2 py-0.5 border border-orange-500/20 bg-orange-500/5 self-start">
                      <AlertTriangle size={10} />
                      <span>AI_FLAG: {comment.aiReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-1 pt-1">
                <StatusBadge status={comment.status} />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-end">
                <CommentModerationActions
                  commentId={comment.id}
                  status={comment.status}
                />
              </div>
            </div>

            {/* Mobile Item */}
            <div className="md:hidden p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.has(comment.id)}
                    onCheckedChange={() => handleSelectOne(comment.id)}
                    className="rounded-none border-border"
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center border border-border shrink-0">
                      {comment.user?.image ? (
                        <img
                          src={comment.user.image}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-mono">
                          {comment.user?.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-serif tracking-tight">
                        {comment.user?.name}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">
                        {formatDate(comment.createdAt).split(" ")[0]}
                      </div>
                    </div>
                  </div>
                </div>
                <StatusBadge status={comment.status} />
              </div>

              <ExpandableContent
                content={comment.content as JSONContent}
                maxLines={3}
                className="text-sm leading-relaxed"
              />

              <div className="flex flex-col gap-2 text-[10px] font-mono text-muted-foreground bg-muted/20 p-3">
                {comment.post && (
                  <Link
                    to="/post/$slug"
                    params={{ slug: comment.post.slug || "" }}
                    hash={`comment-${comment.id}`}
                    search={{
                      highlightCommentId: comment.id,
                      rootId: comment.rootId || undefined,
                    }}
                    className="truncate hover:text-foreground transition-colors"
                  >
                    <span className="opacity-40">跳至评论 / </span>
                    {comment.post.title}
                  </Link>
                )}
                {comment.replyToUser && (
                  <div>
                    <span className="opacity-40">回复 / </span>@
                    {comment.replyToUser.name}
                  </div>
                )}
                {comment.aiReason && (
                  <div className="text-[10px] font-serif italic text-orange-600/80 flex items-center gap-2 pt-1">
                    <AlertTriangle size={10} />
                    <span>{comment.aiReason}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border/30">
                <CommentModerationActions
                  commentId={comment.id}
                  status={comment.status}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Container */}
      <div className="pt-12 px-2 border-t border-border/30">
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={response.total}
          itemsPerPage={PAGE_SIZE}
          currentPageItemCount={response.items.length}
          onPageChange={(newPage) =>
            navigate({
              search: (prev) => ({ ...prev, page: newPage }),
            })
          }
        />
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    published: "已发布",
    pending: "待审核",
    verifying: "验证中",
    deleted: "已删除",
  };

  const styles: Record<string, string> = {
    published: "text-foreground",
    pending: "text-amber-500",
    verifying: "text-blue-500",
    deleted: "text-muted-foreground",
  };

  return (
    <div
      className={`font-mono text-[9px] uppercase tracking-widest ${styles[status] || ""}`}
    >
      [{labels[status] || status}]
    </div>
  );
};
