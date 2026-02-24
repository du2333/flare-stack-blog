import {
  CheckSquare,
  Film,
  Filter,
  Guitar,
  Headphones,
  Image as ImageIcon,
  LayoutGrid,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MediaCategory } from "@/features/media/media.schema";

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
}: MediaToolbarProps) {
  return (
    <div className="flex flex-col gap-4 mb-8 w-full border-b border-border/30 pb-8">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => onCategoryChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-mono whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              }`}
            >
              <Icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
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
