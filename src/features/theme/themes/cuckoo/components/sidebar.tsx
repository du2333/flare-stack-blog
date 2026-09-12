import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Suspense } from "react";
import { approvedFriendLinksQuery } from "@/features/friend-links/queries";
import { tagsQueryOptions } from "@/features/tags/queries";
import { useSidebarToc } from "@/features/theme/themes/cuckoo/components/toc-store";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import TableOfContents from "../pages/post/components/table-of-contents";

/**
 * 侧栏(对应原主题 includes/sidebar.php):
 * 站点信息卡 + 标签云 + 友情链接 + 文章目录(仅文章页)。
 */
export function Sidebar({ className }: { className?: string }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <aside className={cn("flex min-w-0 flex-col", className)}>
      {/* 站点信息卡(.sidebar-info) */}
      <div className="cuckoo-card-base cuckoo-card-hoverable cuckoo-onload-animation">
        <div className="relative h-30 overflow-hidden">
          {siteConfig.theme.cuckoo.sidebarBg ? (
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-300"
              style={{
                backgroundImage: `url(${siteConfig.theme.cuckoo.sidebarBg})`,
              }}
            />
          ) : (
            <div
              className="h-full w-full transition-transform duration-300"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.75 0.14 15), oklch(0.8 0.1 300))",
              }}
            />
          )}
          {/* 头像(半悬浮于底图下缘) */}
          <div
            className="absolute top-14 left-1/2 h-25 w-25 -translate-x-1/2 overflow-hidden rounded-full shadow-lg"
            style={{ backgroundColor: "var(--cuckoo-card-bg)" }}
          >
            {siteConfig.theme.cuckoo.avatar ? (
              <img
                src={siteConfig.theme.cuckoo.avatar}
                alt={siteConfig.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="cuckoo-text-50 flex h-full w-full items-center justify-center">
                {siteConfig.title.slice(0, 1)}
              </div>
            )}
          </div>
        </div>
        <div className="cuckoo-text-90 mt-14 px-6 pb-5 text-center">
          <div className="text-xl font-medium">{siteConfig.title}</div>
          <div className="cuckoo-text-50 mt-1.5 text-sm leading-relaxed">
            {siteConfig.description}
          </div>
        </div>
      </div>

      {/* 标签云(.sidebar-module) */}
      <div
        className="cuckoo-card-base cuckoo-card-hoverable cuckoo-onload-animation mt-5"
        style={{ animationDelay: "100ms" }}
      >
        <Suspense fallback={<SidebarModuleSkeleton />}>
          <SidebarTags />
        </Suspense>
      </div>

      {/* 友情链接(.sidebar-module) */}
      <div
        className="cuckoo-card-base cuckoo-card-hoverable cuckoo-onload-animation mt-5"
        style={{ animationDelay: "150ms" }}
      >
        <Suspense fallback={<SidebarModuleSkeleton />}>
          <SidebarFriendLinks />
        </Suspense>
      </div>

      {/* 文章目录(仅文章页且目录非空时显示,对应原主题侧栏 #toc) */}
      <SidebarToc />
    </aside>
  );
}

function SidebarToc() {
  const headers = useSidebarToc();
  if (headers.length === 0) return null;

  return (
    <div className="cuckoo-card-base cuckoo-card-hoverable cuckoo-onload-animation mt-5 hidden lg:block lg:sticky lg:top-16">
      <div className="pb-2.5">
        <SidebarModuleTitle title={m.sidebar_toc_cuckoo()} />
        <div className="px-3 pt-1">
          <TableOfContents headers={headers} />
        </div>
      </div>
    </div>
  );
}

function SidebarModuleTitle({ title }: { title: string }) {
  return (
    <>
      <div className="cuckoo-text-90 mt-3 text-center text-sm font-medium">
        {title}
      </div>
      <div
        className="mt-2.5 border-t"
        style={{ borderColor: "var(--cuckoo-divider)" }}
      />
    </>
  );
}

function SidebarModuleSkeleton() {
  return (
    <div className="animate-pulse px-4 pb-4">
      <div className="cuckoo-text-30 mx-auto mt-3 h-4 w-20 rounded bg-current" />
      <div className="mt-3 flex flex-wrap gap-2 border-t border-transparent pt-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="cuckoo-text-30 h-8 w-16 rounded bg-current opacity-40"
          />
        ))}
      </div>
    </div>
  );
}

function SidebarTags() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  return (
    <div className="pb-2">
      <SidebarModuleTitle title={m.sidebar_tag_cloud_cuckoo()} />
      <div className="flex flex-wrap gap-2 p-3.5">
        {tags.length > 0 ? (
          tags.slice(0, 12).map((tag) => (
            <Link
              key={tag.name}
              to="/posts"
              search={{ tagName: tag.name }}
              className="cuckoo-chip"
            >
              {tag.name}
            </Link>
          ))
        ) : (
          <div className="cuckoo-text-30 w-full py-2 text-center text-sm">
            {m.sidebar_no_tags_cuckoo()}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarFriendLinks() {
  const { data: links } = useSuspenseQuery(approvedFriendLinksQuery());

  return (
    <div className="pb-2">
      <SidebarModuleTitle title={m.sidebar_friend_links_cuckoo()} />
      <div className="grid grid-cols-2 gap-x-3 px-3.5 pb-3">
        {links.length > 0 ? (
          links.slice(0, 6).map((link) => (
            <a
              key={link.id}
              href={link.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="cuckoo-text-75 hover:text-(--cuckoo-accent) truncate py-2 text-sm transition-colors"
              title={link.siteName}
            >
              {link.siteName}
            </a>
          ))
        ) : (
          <div className="cuckoo-text-30 col-span-2 py-2 text-center text-sm">
            {m.sidebar_no_links_cuckoo()}
          </div>
        )}
      </div>
    </div>
  );
}
