import { useMutation } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildSearchIndexFn } from "@/features/search/api/search.api";
import ConfirmationModal from "@/components/ui/confirmation-modal";

export function SearchMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const rebuildToastId = "search-index-rebuild";
  const rebuildSearchIndexMutation = useMutation({
    mutationFn: buildSearchIndexFn,
    onMutate: () => {
      toast.loading("正在重新映射索引...", { id: rebuildToastId });
    },
    onSuccess: (result) => {
      toast.success(
        `索引重建完成 (耗时 ${result.duration}ms, 共 ${result.indexed} 条数据)`,
        { id: rebuildToastId },
      );
    },
    onSettled: (_data, error) => {
      if (!error) return;
      toast.dismiss(rebuildToastId);
    },
  });

  const handleRebuild = () => {
    setIsModalOpen(false);
    rebuildSearchIndexMutation.mutate({});
  };

  return (
    <div className="flex flex-col overflow-hidden border border-border/30 bg-background/50">
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-sm bg-muted/30 p-2">
            <Database size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-serif font-medium text-foreground tracking-tight">
              重建搜索索引
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              全量同步数据库记录至搜索映射表。
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          全量同步数据库记录至搜索映射表。建议在手动修改数据库或批量录入后执行。
        </p>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={rebuildSearchIndexMutation.isPending}
          className="h-10 w-full gap-3 rounded-none bg-foreground px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90"
        >
          {rebuildSearchIndexMutation.isPending ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          重建索引
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleRebuild}
        title="确认索引重建"
        message="该操作将全量扫描所有数据库日志并重新建立搜索映射。在执行过程中，前端搜索功能可能出现短暂不可用或延迟。是否确认执行？"
        confirmLabel="执行重建"
      />
    </div>
  );
}
