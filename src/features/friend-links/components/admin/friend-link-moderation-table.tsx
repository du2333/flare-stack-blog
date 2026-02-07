import { RouteApi } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  Link2Off,
  Loader2,
  Pencil,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FRIEND_LINKS_KEYS, allFriendLinksQuery } from "../../queries";
import { useAdminFriendLinks } from "../../hooks/use-friend-links";

import type { FriendLinkStatus } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AdminPagination } from "@/components/admin/admin-pagination";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { formatDate } from "@/lib/utils";

interface FriendLinkModerationTableProps {
  status?: FriendLinkStatus;
  page?: number;
}

const PAGE_SIZE = 20;
const routeApi = new RouteApi({ id: "/admin/friend-links/" });

export const FriendLinkModerationTable = ({
  status,
  page = 1,
}: FriendLinkModerationTableProps) => {
  const navigate = routeApi.useNavigate();
  const { data: response, isLoading } = useQuery(
    allFriendLinksQuery({
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { approve, reject } = useAdminFriendLinks();
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
    const toastId = toast.loading(`正在批准 ${selectedIds.size} 条友链...`);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => approve({ data: { id } })),
      );
      toast.success("批量批准完成", { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
    } catch {
      toast.error("部分操作失败", { id: toastId });
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    const toastId = toast.loading(`正在拒绝 ${selectedIds.size} 条友链...`);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => reject({ data: { id } })),
      );
      toast.success("批量拒绝完成", { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
    } catch {
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
        <Link2Off size={40} strokeWidth={1} className="opacity-20" />
        <p>暂无友链记录</p>
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
              onClick={handleBatchReject}
              className="h-8 px-4 rounded-none border-border/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-mono text-[10px] uppercase tracking-widest"
            >
              [ 批量拒绝 ]
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
          提交者
        </div>
        <div className="col-span-3 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          站点信息
        </div>
        <div className="col-span-3 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          详情
        </div>
        <div className="col-span-1 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          状态
        </div>
        <div className="col-span-2 text-right text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          操作
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-border/30">
        {response.items.map((item) => (
          <div
            key={item.id}
            className={`
              group transition-all duration-500
              ${selectedIds.has(item.id) ? "bg-muted/30" : "hover:bg-muted/10"}
            `}
          >
            {/* Desktop Item */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-6 items-start hover:bg-accent/5 transition-colors">
              <div className="col-span-1 flex justify-center pt-1">
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => handleSelectOne(item.id)}
                  className="rounded-none border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                />
              </div>

              {/* Submitter Info */}
              <div className="col-span-2 space-y-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-none bg-muted/20 flex items-center justify-center border border-border/30 shrink-0">
                    {item.user?.image ? (
                      <img
                        src={item.user.image}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <span className="text-[10px] font-mono">
                        {item.user?.name.slice(0, 1) || "A"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-serif font-medium truncate">
                      {item.user?.name || "管理员添加"}
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      {formatDate(item.createdAt).split(" ")[0]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Info */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  {item.logoUrl && (
                    <img
                      src={item.logoUrl}
                      className="w-5 h-5 rounded-sm object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="text-sm font-serif font-medium truncate">
                    {item.siteName}
                  </span>
                </div>
                <a
                  href={item.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{item.siteUrl}</span>
                </a>
              </div>

              {/* Details */}
              <div className="col-span-3 space-y-2">
                {item.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.contactEmail && (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {item.contactEmail}
                  </div>
                )}
                {item.rejectionReason && (
                  <div className="text-[10px] font-mono text-orange-500 flex items-center gap-1">
                    <span>拒绝理由: {item.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="col-span-1 pt-1">
                <StatusBadge status={item.status} />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-end">
                <FriendLinkActions
                  friendLinkId={item.id}
                  status={item.status}
                  friendLink={item}
                />
              </div>
            </div>

            {/* Mobile Item */}
            <div className="md:hidden p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => handleSelectOne(item.id)}
                    className="rounded-none border-border"
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center border border-border shrink-0 grayscale">
                      {item.user?.image ? (
                        <img
                          src={item.user.image}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-mono">
                          {item.user?.name.slice(0, 1) || "A"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-serif tracking-tight">
                        {item.user?.name || "管理员添加"}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">
                        {formatDate(item.createdAt).split(" ")[0]}
                      </div>
                    </div>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {item.logoUrl && (
                    <img
                      src={item.logoUrl}
                      className="w-5 h-5 rounded-sm object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="text-sm font-serif font-medium">
                    {item.siteName}
                  </span>
                </div>
                <a
                  href={item.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{item.siteUrl}</span>
                </a>
              </div>

              <div className="flex flex-col gap-2 text-[10px] font-mono text-muted-foreground bg-muted/20 p-3">
                {item.description && <div>{item.description}</div>}
                {item.contactEmail && <div>{item.contactEmail}</div>}
                {item.rejectionReason && (
                  <div className="text-orange-500">
                    拒绝理由: {item.rejectionReason}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border/30">
                <FriendLinkActions
                  friendLinkId={item.id}
                  status={item.status}
                  friendLink={item}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
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

// ============ Sub-components ============

const StatusBadge = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    approved: "已通过",
    pending: "待审核",
    rejected: "已拒绝",
  };

  const styles: Record<string, string> = {
    approved: "text-foreground",
    pending: "text-amber-500",
    rejected: "text-muted-foreground",
  };

  return (
    <div
      className={`font-mono text-[9px] uppercase tracking-widest ${styles[status] || ""}`}
    >
      [{labels[status] || status}]
    </div>
  );
};

interface FriendLinkActionsProps {
  friendLinkId: number;
  status: string;
  friendLink: {
    siteName: string;
    siteUrl: string;
    description: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
  };
}

const FriendLinkActions = ({
  friendLinkId,
  status,
  friendLink,
}: FriendLinkActionsProps) => {
  const {
    approve,
    reject,
    update,
    adminDelete,
    isApproving,
    isRejecting,
    isUpdating,
    isAdminDeleting,
  } = useAdminFriendLinks();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApprove = async () => {
    setIsOpen(false);
    await approve({ data: { id: friendLinkId } });
  };

  const confirmDelete = async () => {
    await adminDelete({ data: { id: friendLinkId } });
    setShowDeleteConfirm(false);
  };

  const isLoading = isApproving || isRejecting || isUpdating || isAdminDeleting;

  return (
    <div className="flex items-center justify-end relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-auto px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground rounded-none gap-1"
        disabled={isLoading}
        onClick={() => setIsOpen(!isOpen)}
        title="更多操作"
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <span>[ 操作 ]</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border/30 z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-0.5">
            {status !== "approved" && (
              <button
                onClick={handleApprove}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-left hover:bg-muted/10 transition-colors text-foreground group"
              >
                <span>批准</span>
                <Check className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {status !== "rejected" && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowRejectModal(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-left hover:bg-muted/10 transition-colors text-muted-foreground hover:text-red-500 group"
              >
                <span>拒绝</span>
                <X className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                setShowEditModal(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-left hover:bg-muted/10 transition-colors text-foreground group"
            >
              <span>编辑</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          <div className="h-px bg-border/30 my-1" />

          <button
            onClick={() => {
              setIsOpen(false);
              setShowDeleteConfirm(true);
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-left hover:bg-red-500/10 text-red-500 transition-colors group"
          >
            <span>永久销毁</span>
            <ShieldAlert className="h-3 w-3 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="永久删除确认"
        message="此操作将永久从数据库删除该友链，无法恢复！"
        confirmLabel="确认销毁"
        isDanger={true}
        isLoading={isAdminDeleting}
      />

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={async (reason) => {
          await reject({ data: { id: friendLinkId, rejectionReason: reason } });
          setShowRejectModal(false);
        }}
        isLoading={isRejecting}
      />

      <EditModal
        key={friendLinkId}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={async (data) => {
          await update({ data: { id: friendLinkId, ...data } });
          setShowEditModal(false);
        }}
        isLoading={isUpdating}
        initialData={friendLink}
      />
    </div>
  );
};

// ============ Reject Modal ============

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading: boolean;
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-background border border-border/30 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-serif font-medium mb-6">拒绝友链</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              拒绝理由（可选）
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-transparent border border-border/50 px-3 py-2 text-sm font-sans focus:border-foreground focus:outline-none transition-colors resize-none"
              rows={3}
              placeholder="请输入拒绝理由..."
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-widest rounded-none"
            >
              取消
            </Button>
            <Button
              onClick={() => onConfirm(reason || undefined)}
              disabled={isLoading}
              className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest"
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "确认拒绝"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Edit Modal ============

const EditModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    siteName?: string;
    siteUrl?: string;
    description?: string;
    logoUrl?: string;
    contactEmail?: string;
  }) => Promise<void>;
  isLoading: boolean;
  initialData: {
    siteName: string;
    siteUrl: string;
    description: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
  };
}) => {
  const [formData, setFormData] = useState({
    siteName: initialData.siteName,
    siteUrl: initialData.siteUrl,
    description: initialData.description || "",
    logoUrl: initialData.logoUrl || "",
    contactEmail: initialData.contactEmail || "",
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-background border border-border/30 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-serif font-medium mb-6">编辑友链</h3>
        <div className="space-y-4">
          <FormField
            label="站点名称"
            value={formData.siteName}
            onChange={(v) => setFormData((p) => ({ ...p, siteName: v }))}
          />
          <FormField
            label="站点地址"
            value={formData.siteUrl}
            onChange={(v) => setFormData((p) => ({ ...p, siteUrl: v }))}
          />
          <FormField
            label="站点简介"
            value={formData.description}
            onChange={(v) => setFormData((p) => ({ ...p, description: v }))}
          />
          <FormField
            label="Logo 地址"
            value={formData.logoUrl}
            onChange={(v) => setFormData((p) => ({ ...p, logoUrl: v }))}
          />
          <FormField
            label="联系邮箱"
            value={formData.contactEmail}
            onChange={(v) => setFormData((p) => ({ ...p, contactEmail: v }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-widest rounded-none"
            >
              取消
            </Button>
            <Button
              onClick={() => onConfirm(formData)}
              disabled={isLoading}
              className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest"
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
      {label}
    </label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent border-0 border-b border-border/50 text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all shadow-none h-auto py-1.5"
    />
  </div>
);
