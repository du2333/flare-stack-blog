import { useState } from "react";
import { toast } from "sonner";
import { Flame, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { invalidateSiteCacheFn } from "@/features/cache/cache.api";

export function CacheMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInvalidate = () => {
    setIsModalOpen(false);
    toast.promise(invalidateSiteCacheFn, {
      loading: "正在重置全站缓存...",
      success: "全站缓存重置成功",
      error: "缓存重置失败",
    });
  };
  return (
    <div className="flex flex-col border border-border/30 bg-background overflow-hidden group hover:border-red-500/30 transition-colors">
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-red-500/10 rounded-sm">
            <Flame size={16} className="text-red-500/70" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-red-500 animate-pulse rounded-full" />
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-red-500/60 font-medium">
              CRITICAL_ACTION
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-serif font-medium text-foreground tracking-tight underline decoration-red-500/20 underline-offset-4">
            重置全站缓存
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            清除全站 CDN 及 KV
            数据缓存。硬重置操作，请仅在数据严重不同步时执行。
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full h-10 px-4 text-[10px] font-mono uppercase tracking-[0.2em] rounded-none gap-3 bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-500/10"
        >
          <Trash2 size={12} />[ 确认重置 ]
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleInvalidate}
        title="确认重置全站缓存"
        message="该操作将清除 CDN 及 KV 中的所有缓存数据。执行后前台加载速度可能会暂时变慢。是否确认执行？"
        confirmLabel="立即重置"
      />
    </div>
  );
}
