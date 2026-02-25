import {
  CheckSquare,
  Disc,
  Film,
  Filter,
  Guitar,
  Headphones,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Square,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MediaCategory } from "@/features/media/media.schema";
import {
  processUnparsedGuitarTabsFn,
  fetchMissingCoversFn,
} from "@/features/media/media.api";

const CATEGORY_TABS: Array<{
  key: MediaCategory | undefined;
  label: string;
  icon: React.ElementType;
}> = [
  { key: undefined, label: "全部", icon: LayoutGrid },
  { key: "image", label: "图片", icon: ImageIcon },
  { key: "guitar-pro", label: "吉他谱", icon: Guitar },
  { key: "video", label: "视频", icon: Film },
  { key: "audio", label: "音频", icon: Headphones },
  { key: "album-cover", label: "专辑封面", icon: Disc },
  { key: "avatar", label: "头像", icon: UserCircle },
];

interface MediaToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  unusedOnly: boolean;
  onUnusedOnlyChange: (val: boolean) => void;
  category: MediaCategory | undefined;
  onCategoryChange: (val: MediaCategory | undefined) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDelete: () => void;
  onRefetch?: () => void;
}

export function MediaToolbar({
  searchQuery,
  onSearchChange,
  unusedOnly,
  onUnusedOnlyChange,
  category,
  onCategoryChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDelete,
  onRefetch,
}: MediaToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessGuitarTabs = async () => {
    setIsProcessing(true);
    try {
      // Step 1: 处理未解析的吉他谱（解析元数据 + 获取封面）
      const parseResult = await processUnparsedGuitarTabsFn();
      // Step 2: 为已有元数据但没有封面的吉他谱获取封面
      const coverResult = await fetchMissingCoversFn();

      const messages: string[] = [];
      if (parseResult.processed > 0) {
        messages.push(`解析了 ${parseResult.processed} 个吉他谱`);
      }
      if (parseResult.covers > 0) {
        messages.push(`下载了 ${parseResult.covers} 个新封面`);
      }
      if (coverResult.fetched > 0) {
        messages.push(`补充了 ${coverResult.fetched} 个缺失封面`);
      }

      if (messages.length > 0) {
        toast.success("处理完成", { description: messages.join("，") });
        onRefetch?.();
      } else {
        toast.info("所有吉他谱已是最新状态");
      }

      if (parseResult.errors > 0 || coverResult.errors > 0) {
        toast.warning("部分处理失败", {
          description: `${parseResult.errors + coverResult.errors} 个错误`,
        });
      }
    } catch (err) {
      toast.error("处理失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // ── 分类标签滑动指示器 ──
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  const updateTabIndicator = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeKey = String(category ?? "all");
    const el = tabRefs.current.get(activeKey);
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setTabIndicator({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    });
  }, [category]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateTabIndicator covers deps
  useLayoutEffect(() => {
    updateTabIndicator();
  }, [updateTabIndicator]);

  return (
    <div className="flex flex-col gap-4 mb-8 w-full border-b border-border/30 pb-8">
      {/* Category Tabs */}
      <div ref={tabsContainerRef} className="flex items-center gap-1 overflow-x-auto relative">
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.key;
          const tabKey = String(tab.key ?? "all");
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              ref={(el) => {
                if (el) tabRefs.current.set(tabKey, el);
                else tabRefs.current.delete(tabKey);
              }}
              onClick={() => onCategoryChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-mono whitespace-nowrap transition-colors duration-300 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
        {/* 滑动指示器 — 弹性过冲动画 */}
        {tabIndicator && (
          <div
            className="absolute bottom-0 h-[2px] bg-foreground pointer-events-none"
            style={{
              left: tabIndicator.left,
              width: tabIndicator.width,
              transition: "left 500ms cubic-bezier(0.34, 1.56, 0.64, 1), width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        )}
      </div>

      {/* Search, Filter & Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center w-full">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto flex-1">
        <div className="relative group w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
            size={14}
            strokeWidth={1.5}
          />
          <Input
            type="text"
            placeholder="检索媒体文件..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 h-10 bg-transparent border-border/30 hover:border-foreground/50 focus:border-foreground transition-all rounded-none font-sans text-sm shadow-none focus-visible:ring-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSearchChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-none"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        <div className="h-4 w-px bg-border/30 mx-2 hidden lg:block" />

        <Button
          variant={unusedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onUnusedOnlyChange(!unusedOnly)}
          className={`h-10 px-4 gap-2 rounded-none border-border/30 hover:border-foreground transition-all ${
            unusedOnly
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter size={14} strokeWidth={1.5} />
          <span className="text-[11px] uppercase tracking-widest font-mono">
            只显示未引用
          </span>
        </Button>

        {/* 吉他谱批量处理按钮 */}
        {category === "guitar-pro" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessGuitarTabs}
            disabled={isProcessing}
            className="h-10 px-4 gap-2 rounded-none border-border/30 hover:border-foreground transition-all bg-transparent text-muted-foreground hover:text-foreground"
          >
            {isProcessing ? (
              <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <RefreshCw size={14} strokeWidth={1.5} />
            )}
            <span className="text-[11px] uppercase tracking-widest font-mono">
              {isProcessing ? "处理中..." : "解析 & 获取封面"}
            </span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className={`h-10 px-4 text-[11px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 ${
            selectedCount > 0
              ? "text-foreground bg-accent/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {selectedCount > 0 && selectedCount === totalCount ? (
            <CheckSquare size={14} strokeWidth={1.5} />
          ) : (
            <Square size={14} strokeWidth={1.5} />
          )}
          {selectedCount > 0 && selectedCount === totalCount
            ? "[ 取消全选 ]"
            : "[ 全选 ]"}
        </Button>

        {selectedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-10 px-4 text-[11px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <Trash2 size={14} strokeWidth={1.5} />[ 删除选中 ({selectedCount}) ]
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
