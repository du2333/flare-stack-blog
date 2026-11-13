import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Sun,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "@/lib/toast";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/ui/command-palette";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { useCreatePost } from "@/features/posts/components/post-manager/hooks/use-create-post";
import { useMediaQuery } from "@/hooks/use-motion";
import { getAuthClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";
import { adminCommands } from "./admin-commands";
import { useAdminCounts } from "./admin-counts";
import { ADMIN_NAV, currentNavItem, type AdminNavItem } from "./admin-nav";
import "./admin-shell.css";

const SCHEMES = [
  { value: "light", icon: Sun, label: () => m.colour_scheme_light() },
  { value: "dark", icon: Moon, label: () => m.colour_scheme_dark() },
  { value: "system", icon: Monitor, label: () => m.colour_scheme_system() },
] as const;

/**
 * The Admin's shell: the navigation and the page on one canvas. Below
 * 1024px the navigation is a drawer (a modal `Sheet`) opened from the top
 * bar. Ctrl/⌘ K opens the command palette anywhere. Every page lies on the
 * canvas and draws its own surfaces (the page frame, the cards).
 */
export function AdminShell({
  topBar,
  children,
}: {
  topBar: (openNavigation: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const create = useCreatePost();
  const createPost = useCallback(() => create.mutate(), [create]);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The drawer is the phone layout; it closes on its way to another page
  // and when the screen grows past it.
  const desktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (desktop) setNavOpen(false);
  }, [desktop]);

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
    <div className="admin-layout admin-shell">
      <Sheet
        open={navOpen}
        onClose={closeNav}
        side="left"
        as="aside"
        keepMounted
        id="admin-sidebar"
        aria-label={m.admin_layout_title()}
        className="admin-side"
        backdropClassName="admin-side-scrim"
        initialFocus={() => closeRef.current}
      >
        <Sidebar
          closeRef={closeRef}
          onClose={closeNav}
          pathname={pathname}
          onSearch={() => setPaletteOpen(true)}
          onCreatePost={createPost}
          creating={create.isPending}
        />
      </Sheet>
      <main className="admin-main">
        {topBar(() => setNavOpen(true))}
        <div className="admin-stage">{children}</div>
      </main>
      <AdminCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        createPost={createPost}
      />
    </div>
  );
}

function AdminCommandPalette({
  open,
  onClose,
  createPost,
}: {
  open: boolean;
  onClose: () => void;
  createPost: () => void;
}) {
  const navigate = useNavigate();
  const { colourScheme, setColourScheme } = useColourScheme();
  const { data: overview } = useQuery({
    ...dashboardOverviewQuery,
    enabled: open,
  });
  const commands = useMemo(
    () =>
      adminCommands({
        overview,
        navigate,
        createPost,
        colourScheme,
        setColourScheme,
      }),
    [overview, navigate, createPost, colourScheme, setColourScheme],
  );
  return (
    <CommandPalette
      open={open}
      onClose={onClose}
      commands={commands}
      label={m.admin_palette_label()}
      placeholder={m.admin_palette_placeholder()}
      empty={(query) => m.admin_palette_empty({ query })}
      closeKey="esc"
      selectHint={m.admin_palette_select()}
      runHint={m.admin_palette_run()}
    />
  );
}

function pendingLabel(item: AdminNavItem, count: number) {
  if (count <= 0) return undefined;
  return item.count === "comments"
    ? m.admin_sidebar_comments_pending({ count })
    : m.admin_sidebar_friend_links_pending({ count });
}

function Sidebar({
  closeRef,
  onClose,
  pathname,
  onSearch,
  onCreatePost,
  creating,
}: {
  /** The drawer's close button, which takes focus when the drawer opens. */
  closeRef: Ref<HTMLButtonElement>;
  onClose: () => void;
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
    <>
      <div className="admin-side-head">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="admin-brand"
          title={m.admin_sidebar_open_site()}
          aria-label={m.admin_sidebar_site_link({ site: siteConfig.title })}
        >
          <span className="admin-brand-mark">
            {siteConfig.avatar ? (
              <img src={siteConfig.avatar} alt="" />
            ) : (
              siteConfig.title.trim().slice(0, 1)
            )}
          </span>
          <span className="admin-brand-copy">
            <span className="admin-brand-name">{siteConfig.title}</span>
          </span>
          <ArrowUpRight size={15} className="admin-brand-ext" aria-hidden />
        </a>
        {/* Only the drawer has it; laid out in place the sidebar does not close. */}
        <IconButton
          ref={closeRef}
          size="md"
          className="admin-side-close"
          onClick={onClose}
          label={m.admin_shell_close_navigation()}
        >
          <X size={18} />
        </IconButton>
      </div>

      <div className="admin-quick">
        <CommandPaletteTrigger
          label={m.admin_shell_search()}
          shortcut={mac ? "⌘K" : "Ctrl K"}
          onClick={onSearch}
        />
        <IconButton
          variant="ink"
          className="admin-compose"
          onClick={onCreatePost}
          disabled={creating}
          label={m.admin_posts_create()}
        >
          <PenLine size={16} />
        </IconButton>
      </div>

      <nav
        ref={navRef}
        className="admin-nav"
        aria-label={m.admin_layout_title()}
      >
        <span ref={pillRef} className="admin-nav-pill" aria-hidden />
        {ADMIN_NAV.map((group) => {
          const label = group.label?.();
          return (
            <div
              key={group.id}
              className="admin-nav-group"
              role={label ? "group" : undefined}
              aria-label={label}
            >
              {label ? (
                <p className="admin-nav-label" aria-hidden>
                  {label}
                </p>
              ) : null}
              {group.items.map((item) => {
                const count = item.count ? counts[item.count] : 0;
                const name = item.label();
                const pending = pendingLabel(item, count);
                const isCurrent = current?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    activeOptions={{ exact: true }}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={
                      pending
                        ? m.admin_sidebar_item_pending({ label: name, pending })
                        : name
                    }
                    data-current={isCurrent ? "" : undefined}
                    className="admin-nav-item"
                  >
                    <item.icon size={17} strokeWidth={1.7} />
                    <span className="admin-nav-text">{name}</span>
                    {pending ? (
                      <span className="admin-nav-count" aria-hidden>
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

      <div className="admin-side-foot">
        <AccountMenu />
      </div>
    </>
  );
}

/** Who is signed in; the menu switches the colour scheme and signs out. */
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
      triggerClassName="admin-account"
      matchTriggerWidth
      trigger={
        <>
          <span className="admin-avatar">
            {user.image ? (
              <img src={user.image} alt="" />
            ) : (
              name.trim().slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="admin-account-name">{name}</span>
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
