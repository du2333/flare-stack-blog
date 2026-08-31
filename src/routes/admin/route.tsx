import {
  createFileRoute,
  Outlet,
  redirect,
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
  useVersionCheck();

  return (
    <AdminChromeProvider>
      <div className="admin-layout h-screen overflow-hidden bg-(--fuwari-page-bg) text-foreground flex gap-4 p-4 relative font-sans">
        <SideBar
          isMobileSidebarOpen={isMobileSidebarOpen}
          closeMobileSidebar={closeMobileSidebar}
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

function AdminMain() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollerRef}
      className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
    >
      <div className="w-full">
        <PageFade
          includeSearch={false}
          pathKey={(pathname) =>
            settingsSectionFromPath(pathname) ? "/admin/settings/*" : pathname
          }
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
  const { primaryAction } = useAdminChrome();

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
          {pageTitle}
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
