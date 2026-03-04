import { useMutation } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildSearchIndexFn } from "@/features/search/search.api";
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
    <div className="flex flex-col border border-border/30 bg-background overflow-hidden group hover:border-border/60 transition-colors">
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-muted/30 rounded-sm">
            <Database size={16} className="text-muted-foreground" />
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground opacity-50">
            SEARCH_ENGINE
          </span>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-serif font-medium text-foreground tracking-tight underline decoration-border/30 underline-offset-4">
            重建搜索映射
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            全量同步数据库记录至搜索映射表。建议在手动修改数据库或批量录入后执行。
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={rebuildSearchIndexMutation.isPending}
          className="w-full h-10 px-4 text-[10px] font-mono uppercase tracking-[0.2em] rounded-none gap-3 bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          {rebuildSearchIndexMutation.isPending ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          [ 启动重建 ]
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
