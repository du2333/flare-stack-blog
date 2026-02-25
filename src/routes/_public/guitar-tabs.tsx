import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Grid2x2,
  Grid3x3,
  Guitar,
  List,
  Music,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import {
  GuitarTabListCard,
  GuitarTabGridCard,
} from "@/features/media/components/guitar-tab-card";
import { GuitarProViewer } from "@/features/media/components/guitar-pro-viewer";
import { guitarTabsQueryOptions } from "@/features/media/queries";
import { blogConfig } from "@/blog.config";

type ViewMode = "list" | "small-grid" | "large-grid";

const VIEW_MODE_KEY = "guitar-tabs-view-mode";
const PAGE_SIZE_KEY = "guitar-tabs-page-size";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [12, 20, 30, 50];

function getSavedViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === "list" || saved === "small-grid" || saved === "large-grid")
    return saved;
  return "list";
}

function getSavedPageSize(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const saved = localStorage.getItem(PAGE_SIZE_KEY);
  if (saved) {
    const n = parseInt(saved);
    if (PAGE_SIZE_OPTIONS.includes(n)) return n;
  }
  return DEFAULT_PAGE_SIZE;
}

export const Route = createFileRoute("/_public/guitar-tabs")({
  validateSearch: z.object({
    search: z.string().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  }),
  component: GuitarTabsPage,
  loaderDeps: ({ search: { search, page, pageSize } }) => ({ search, page, pageSize }),
  beforeLoad: () => {
    if (!blogConfig.features.guitarTabs) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context, deps }) => {
    await context.queryClient.prefetchQuery(
      guitarTabsQueryOptions(deps.search, deps.page ?? 1, deps.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    return {
      title: "吉他谱",
      description: "浏览和播放吉他谱收藏",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: "description", content: loaderData?.description },
    ],
  }),
});

function GuitarTabsPage() {
  const { search, page: urlPage, pageSize: urlPageSize } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [searchInput, setSearchInput] = useState(search || "");
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode);

  const page = urlPage ?? 1;
  const pageSize = urlPageSize ?? getSavedPageSize();

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  const handlePageSizeChange = useCallback(
    (size: number) => {
      localStorage.setItem(PAGE_SIZE_KEY, String(size));
      navigate({
        search: (prev) => ({ ...prev, page: 1, pageSize: size }),
        replace: true,
      });
    },
    [navigate],
  );

  const { data } = useSuspenseQuery(
    guitarTabsQueryOptions(search, page, pageSize),
  );

  const tabs = data.items;
  const totalCount = data.total;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 搜索去抖
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== (search || "")) {
        navigate({
          search: { search: trimmed || undefined, page: 1, pageSize },
          replace: true,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, navigate, search, pageSize]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      navigate({
        search: (prev) => ({ ...prev, page: newPage }),
        replace: true,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
  );

  // ── 查看器状态 ──
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [originRect, setOriginRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>();
  const activeCardRef = useRef<HTMLButtonElement | null>(null);

  const handleOpenTab = useCallback(
    (tab: { key: string; title: string | null; fileName: string }, buttonEl: HTMLButtonElement) => {
      const url = `/images/${tab.key}?original=true`;
      const r = buttonEl.getBoundingClientRect();
      setOriginRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      activeCardRef.current = buttonEl;
      setViewerFile({ url, name: tab.title || tab.fileName });
      setViewerOpen(true);
    },
    [],
  );

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setTimeout(() => {
      activeCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }, []);

  return (
    <div className="min-h-[60vh] py-10">
      <div className={viewMode === "list" ? "max-w-3xl mx-auto px-4 sm:px-6" : "max-w-5xl mx-auto px-4 sm:px-6"}>
        {/* ════════════════════════════════════════════════
            页面头部
            ════════════════════════════════════════════════ */}
        <div className="mb-10">
          {/* 标题区 + 视图切换 */}
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <Guitar size={22} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-medium tracking-tight leading-tight">
                  吉他谱
                </h1>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">
                  {totalCount === 0
                    ? "暂无曲谱"
                    : `${totalCount} 首收藏`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 每页数量选择 */}
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8 px-2 rounded-lg border border-border/30 bg-muted/30 text-xs text-muted-foreground cursor-pointer focus:outline-none focus:border-accent/50"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / 页
                  </option>
                ))}
              </select>

              {/* 视图模式切换 */}
              <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/30 border border-border/30">
                <ViewModeButton
                  active={viewMode === "list"}
                  onClick={() => handleViewModeChange("list")}
                  title="列表视图"
                >
                  <List size={14} />
                </ViewModeButton>
                <ViewModeButton
                  active={viewMode === "small-grid"}
                  onClick={() => handleViewModeChange("small-grid")}
                  title="小缩略图"
                >
                  <Grid3x3 size={14} />
                </ViewModeButton>
                <ViewModeButton
                  active={viewMode === "large-grid"}
                  onClick={() => handleViewModeChange("large-grid")}
                  title="大缩略图"
                >
                  <Grid2x2 size={14} />
                </ViewModeButton>
              </div>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative group">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-accent"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索曲名、艺术家..."
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  navigate({ search: { page: 1, pageSize }, replace: true });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            曲谱内容
            ════════════════════════════════════════════════ */}
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5">
              <Music
                size={28}
                className="text-muted-foreground/20"
              />
            </div>
            <p className="text-sm text-muted-foreground/70 font-medium">
              {search ? "没有找到匹配的吉他谱" : "还没有上传吉他谱"}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearchInput("");
                  navigate({ search: { page: 1, pageSize }, replace: true });
                }}
                className="mt-4 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer font-medium"
              >
                清除搜索
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ── 列表视图 ── */
          <div className="space-y-3">
            {tabs.map((tab) => (
              <GuitarTabListCard
                key={tab.id}
                tab={tab}
                isActive={
                  viewerFile?.url === `/images/${tab.key}?original=true`
                }
                onClick={(e) =>
                  handleOpenTab(tab, e.currentTarget)
                }
              />
            ))}
          </div>
        ) : (
          /* ── 网格视图 ── */
          <div
            className={
              viewMode === "large-grid"
                ? "grid grid-cols-2 sm:grid-cols-3 gap-4"
                : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            }
          >
            {tabs.map((tab) => (
              <GuitarTabGridCard
                key={tab.id}
                tab={tab}
                size={viewMode === "large-grid" ? "large" : "small"}
                isActive={
                  viewerFile?.url === `/images/${tab.key}?original=true`
                }
                onClick={(e) =>
                  handleOpenTab(tab, e.currentTarget)
                }
              />
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            分页控件
            ════════════════════════════════════════════════ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10 mb-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-border/30 text-muted-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <PaginationNumbers
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-border/30 text-muted-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            投稿入口
            ════════════════════════════════════════════════ */}
        <div className="mt-16 mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-muted/20 border border-border/20">
            <Upload size={14} className="text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/60">
              有好的吉他谱想分享？
            </span>
            <Link
              to="/submit-guitar-tab"
              className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
            >
              去投稿
            </Link>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          全屏播放器
          ════════════════════════════════════════════════ */}
      <GuitarProViewer
        isOpen={viewerOpen}
        fileUrl={viewerFile?.url ?? ""}
        fileName={viewerFile?.name ?? ""}
        onClose={handleCloseViewer}
        originRect={originRect}
      />
    </div>
  );
}

// ── 视图切换按钮 ──────────────────────────────────────

function ViewModeButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground/50 hover:text-muted-foreground/80"
      }`}
    >
      {children}
    </button>
  );
}

// ── 分页页码组件 ──────────────────────────────────────

function PaginationNumbers({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const result: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (currentPage > 3) result.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) result.push(i);
      if (currentPage < totalPages - 2) result.push("...");
      result.push(totalPages);
    }
    return result;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-xs text-muted-foreground/40"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              p === currentPage
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}
