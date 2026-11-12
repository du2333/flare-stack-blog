// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
import "@fontsource-variable/geist/wght.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  PenLine,
  Search,
  Sun,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { useAdminCounts } from "@/components/admin/admin-counts";
import { ADMIN_NAV, currentNavItem } from "@/components/admin/admin-nav";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getAuthClient } from "@/lib/auth/auth-client";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { CommandPalette } from "./command-palette";
import "./studio.css";

const SCHEMES = [
  { value: "light", icon: Sun, label: () => m.colour_scheme_light() },
  { value: "dark", icon: Moon, label: () => m.colour_scheme_dark() },
  { value: "system", icon: Monitor, label: () => m.colour_scheme_system() },
] as const;

/** Creates a Post and opens it in the editor; shared by the sidebar, ⌘K and the overview. */
export function useCreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      void queryClient.invalidateQueries({
        queryKey: orpc.dashboard.overview.key(),
      });
      void navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(post.id) },
      });
    },
  });
}

/**
 * The new shell: navigation on the canvas, the page beside it. The overview
 * lays its cards straight on the canvas; a page not redesigned yet gets a
 * sheet (`sheet`).
 */
export function StudioShell({
  sheet,
  topBar,
  children,
}: {
  sheet: boolean;
  topBar: (openNavigation: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const create = useCreatePost();
  const createPost = useCallback(() => create.mutate(), [create]);

  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="admin-layout studio"
      data-nav-open={navOpen ? "" : undefined}
    >
      <Sidebar
        pathname={pathname}
        onSearch={() => setPaletteOpen(true)}
        onCreatePost={createPost}
        creating={create.isPending}
      />
      <div className="st-scrim" onClick={() => setNavOpen(false)} />
      <main className={`st-main ${sheet ? "is-sheet" : ""}`}>
        {topBar(() => setNavOpen(true))}
        <div className="st-stage">{children}</div>
      </main>
      {paletteOpen ? (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onCreatePost={createPost}
        />
      ) : null}
    </div>
  );
}

function Sidebar({
  pathname,
  onSearch,
  onCreatePost,
  creating,
}: {
  pathname: string;
  onSearch: () => void;
  onCreatePost: () => void;
  creating: boolean;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const current = currentNavItem(pathname);
  const counts = useAdminCounts();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  // The pill behind the current entry slides to wherever that entry is.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const item = nav.querySelector<HTMLElement>("[data-current]");
    if (!item) {
      delete nav.dataset.pill;
      return;
    }
    pill.style.transform = `translateY(${item.offsetTop}px)`;
    if (!nav.dataset.pill) {
      nav.dataset.pill = "placed";
      requestAnimationFrame(() => {
        nav.dataset.pill = "moving";
      });
    }
  }, [current?.id]);

  return (
    <aside className="st-side" aria-label={m.admin_layout_title()}>
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="st-brand"
        title={m.admin_sidebar_open_site()}
      >
        <span className="st-brand-mark">
          {siteConfig.avatar ? (
            <img src={siteConfig.avatar} alt="" />
          ) : (
            siteConfig.title.trim().slice(0, 1)
          )}
        </span>
        <span className="st-brand-copy">
          <span className="st-brand-name">{siteConfig.title}</span>
        </span>
        <ArrowUpRight size={15} className="st-brand-ext" aria-hidden />
      </a>

      <div className="st-quick">
        <button type="button" className="st-search" onClick={onSearch}>
          <Search size={15} />
          <span>搜索</span>
          <kbd className="admin-kbd">{mac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <button
          type="button"
          className="st-compose"
          onClick={onCreatePost}
          disabled={creating}
          title={m.admin_posts_create()}
          aria-label={m.admin_posts_create()}
        >
          <PenLine size={16} />
        </button>
      </div>

      <nav ref={navRef} className="st-nav">
        <span ref={pillRef} className="st-nav-pill" aria-hidden />
        {ADMIN_NAV.map((group) => {
          const label = group.label?.();
          return (
            <div key={group.id} className="st-nav-group">
              {label ? <p className="st-nav-label">{label}</p> : null}
              {group.items.map((item) => {
                const count = item.count ? counts[item.count] : 0;
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    activeOptions={{ exact: true }}
                    aria-current={current?.id === item.id ? "page" : undefined}
                    data-current={current?.id === item.id ? "" : undefined}
                    className="st-nav-item"
                  >
                    <item.icon size={17} strokeWidth={1.7} />
                    <span className="st-nav-text">{item.label()}</span>
                    {count > 0 ? (
                      <span className="st-nav-count">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="st-foot">
        <AccountMenu />
      </div>
    </aside>
  );
}

function AccountMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useRouteContext({ from: "/admin" });
  const { colourSchemePreference, setColourScheme } = useColourScheme();
  const user = session.user;
  const name = user.name || m.admin_sidebar_admin_fallback();

  const signOut = async () => {
    const { error } = await getAuthClient().signOut();
    if (error) {
      toast.error(m.admin_sidebar_logout_failed());
      return;
    }
    resetAuthBoundQueries(queryClient);
    void navigate({ to: "/login" });
  };

  return (
    <Menu
      label={m.admin_sidebar_account_menu()}
      placement="top-start"
      triggerClassName="st-account"
      matchTriggerWidth
      trigger={
        <>
          <span className="st-avatar">
            {user.image ? (
              <img src={user.image} alt="" />
            ) : (
              name.trim().slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="st-account-name">{name}</span>
          <ChevronsUpDown size={14} aria-hidden />
        </>
      }
    >
      <MenuLabel>{m.admin_sidebar_colour_scheme()}</MenuLabel>
      {SCHEMES.map((scheme) => (
        <MenuItem
          key={scheme.value}
          role="menuitemradio"
          checked={colourSchemePreference === scheme.value}
          onSelect={() => setColourScheme(scheme.value)}
        >
          <scheme.icon size={15} aria-hidden className="shrink-0" />
          <span className="flex-1">{scheme.label()}</span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem danger onSelect={() => void signOut()}>
        <LogOut size={15} aria-hidden className="shrink-0" />
        <span className="flex-1">{m.admin_sidebar_logout()}</span>
      </MenuItem>
    </Menu>
  );
}
