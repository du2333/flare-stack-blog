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
    toast.promise(
      async () => {
        await invalidateSiteCacheFn();
      },
      {
        loading: "正在重置全站缓存...",
        success: "全站缓存重置成功",
        error: (error) => error.message || "缓存重置失败",
      },
    );
  };
  return (
    <div className="flex flex-col overflow-hidden border border-border/30 bg-background/50">
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-sm bg-red-500/10 p-2">
            <Flame size={16} className="text-red-500/70" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-serif font-medium text-foreground tracking-tight">
              重置全站缓存
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              清除 CDN 和 KV 缓存，适合在内容严重不同步时执行。
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          执行后，首页、文章页和其他缓存内容会重新回源生成。通常只在发布后页面长时间未更新、资源版本异常，或手动修复数据后仍然显示旧内容时使用。
        </p>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-10 w-full gap-3 rounded-none bg-red-600 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white transition-all hover:bg-red-700"
        >
          <Trash2 size={12} />
          重置缓存
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
