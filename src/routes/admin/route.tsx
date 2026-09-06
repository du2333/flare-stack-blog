import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useMatches,
} from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useRef, useState } from "react";
import {
  AdminChromeProvider,
  useAdminChrome,
} from "@/components/admin/admin-chrome";
import { SideBar } from "@/components/admin/side-bar";
import { PageFade } from "@/components/layout/page-fade";
import { Toaster } from "@/components/layout/toaster";
import { sessionQuery } from "@/features/auth/queries";
import { settingsSectionFromPath } from "@/features/config/components/admin/settings-pages";
import { useVersionCheck } from "@/features/version/hooks/use-version-check";
import { CACHE_CONTROL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);

    if (!session) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      throw redirect({ to: "/" });
    }

    return { session };
  },
  component: AdminLayout,
  loader: () => ({
    title: m.admin_layout_title(),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

function pageTitleFromMatches(matches: ReturnType<typeof useMatches>): string {
  for (let i = matches.length - 1; i >= 0; i--) {
    const title = (matches[i]?.loaderData as { title?: string } | undefined)
      ?.title;
    if (typeof title === "string" && title.length > 0) return title;
  }
  return "";
}

function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const editorWorkspace = isPostEditorPath(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => editorWorkspace,
  );
  useVersionCheck();

  return (
    <AdminChromeProvider>
      <div
        className={cn(
          "admin-layout h-dvh overflow-hidden bg-(--fuwari-page-bg) text-foreground flex gap-4 p-4 relative font-sans",
          editorWorkspace && "admin-editor-layout",
        )}
      >
        <SideBar
          isMobileSidebarOpen={isMobileSidebarOpen}
          closeMobileSidebar={closeMobileSidebar}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <MobileTopBar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
          <AdminMain />
        </main>
        <Toaster />
      </div>
    </AdminChromeProvider>
  );
}

function isPostEditorPath(pathname: string) {
  return /\/admin\/posts\/edit\/[^/]+/.test(pathname);
}

function AdminMain() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathname = useLocation({ select: (location) => location.pathname });
  const fill = isPostEditorPath(pathname);

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "flex-1 min-h-0",
        fill
          ? "flex flex-col overflow-hidden"
          : "overflow-y-auto custom-scrollbar",
      )}
    >
      <div className={cn("w-full", fill && "flex min-h-0 flex-1 flex-col")}>
        <PageFade
          fill={fill}
          includeSearch={false}
          pathKey={(path) => {
            if (settingsSectionFromPath(path)) return "/admin/settings/*";
            const edit = path.match(/\/admin\/posts\/edit\/([^/]+)/);
            if (edit) return `/admin/posts/edit/${edit[1]}`;
            return path;
          }}
          onEntered={() => scrollerRef.current?.scrollTo(0, 0)}
        >
          <Outlet />
        </PageFade>
      </div>
    </div>
  );
}

function MobileTopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const matches = useMatches();
  const pageTitle = pageTitleFromMatches(matches);
  const { primaryAction, mobileTitle } = useAdminChrome();

  return (
    <header className="lg:hidden shrink-0 mb-4">
      <div className="fuwari-card-base flex items-center gap-3 px-3 h-16">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg fuwari-text-75 hover:text-(--fuwari-primary)"
          aria-label={m.admin_layout_open_navigation()}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-base font-medium fuwari-text-90">
          {mobileTitle ?? pageTitle}
        </h1>
        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="fuwari-btn-primary rounded-xl h-9 px-3 text-sm font-medium shrink-0"
          >
            {primaryAction.label}
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>
    </header>
  );
}
