import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { ChevronsUpDown, Search, UserIcon } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type {
  NavGroupOption,
  NavLinkOption,
  NavOption,
  UserInfo,
} from "@/components/layout/layout-props";
import { MobileMenu } from "@/components/layout/mobile-menu";
import {
  currentNavLink,
  isNavGroup,
  isNavOptionCurrent,
} from "@/components/layout/nav-options";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { SocialLinks } from "@/components/layout/social-links";
import { useMenuPanel } from "@/components/layout/use-menu-panel";
import { Button, buttonClass } from "@/components/ui/button";
import { DisclosureChevron, DisclosurePanel } from "@/components/ui/disclosure";
import { Skeleton } from "@/components/ui/skeleton";
import { TocSlot } from "@/features/theme/components/toc-slot";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Brand } from "./brand";
import {
  currentRowIndex,
  defaultOpenGroups,
  entryIcon,
  GROUP_ICON,
} from "./nav-entry";

export interface RailProps {
  navOptions: Array<NavOption>;
  user?: UserInfo;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AVATAR_SIZE = 88;
const ACCOUNT_PANEL_ID = "sidebar-account-panel";

/**
 * Who writes here: the avatar, the author and the description. It is what
 * the profile card says, so the stylesheet hides that card wherever the
 * rail shows this (sidebar.css). It stands in a box that folds to nothing
 * where the table of contents of a Post has its place (rail.css).
 */
function Identity() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  return (
    <div className="sidebar-identity-fold">
      <div className="sidebar-identity">
        <Link
          to="/"
          className="sidebar-avatar"
          aria-label={m.profile_avatar_label()}
        >
          <img
            src={getPublicImageSrc(
              siteConfig.avatar,
              PUBLIC_IMAGE_WIDTH.avatar,
            )}
            alt=""
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
          />
        </Link>
        <p className="sidebar-author">{siteConfig.author}</p>
        {siteConfig.description ? (
          <p className="sidebar-description">{siteConfig.description}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The place of the table of contents of a Post, under the navigation: a
 * title over the slot the list renders into (`TocSlot`). It has no height
 * until the page on screen has a table of contents; then it takes what the
 * rail has left down to its foot, and the list scrolls within it (rail.css).
 * It is on every page, so it is still there while a Post's page fades out.
 */
function Contents() {
  return (
    <div className="sidebar-rail-toc">
      <p className="sidebar-rail-toc-title">{m.post_toc()}</p>
      <TocSlot className="sidebar-rail-toc-slot" />
    </div>
  );
}

/** Search, as a link to the search page in the shape of a field. */
function SearchEntry() {
  const onSearchPage = useLocation({
    select: (location) => location.pathname === "/search",
  });
  return (
    <Link
      to="/search"
      className={buttonClass({ variant: "plain", className: "sidebar-search" })}
      data-current={onSearchPage}
    >
      <Search size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{m.nav_search()}</span>
    </Link>
  );
}

/** A link of the navigation as a row, led by its icon unless it is a group's. */
function LinkRow({
  option,
  current,
  child = false,
}: {
  option: NavLinkOption;
  current: boolean;
  child?: boolean;
}) {
  const Icon = entryIcon(option);
  return (
    <div className="sidebar-nav-row" data-child={child || undefined}>
      <PublicNavLink
        option={option}
        className={cn("sidebar-nav-link", current && "sidebar-nav-current")}
      />
      {child ? null : (
        <span className="sidebar-nav-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
}

/**
 * A group as a row that opens in place: its links stand under it, set in,
 * while it is open. It leads nowhere itself. While it holds the current
 * link it is marked so; the pill stands on its row only while it is closed,
 * and on the link's own row while it is open.
 */
function GroupRows({
  group,
  current,
  open,
  onToggle,
}: {
  group: NavGroupOption;
  current: NavLinkOption | null;
  open: boolean;
  onToggle: () => void;
}) {
  const holds = isNavOptionCurrent(group, current);
  const panelId = `sidebar-nav-panel-${group.id}`;
  return (
    <div className="sidebar-nav-group">
      <div className="sidebar-nav-row">
        <Button
          variant="plain"
          className={cn(
            "sidebar-nav-link sidebar-nav-trigger",
            holds && !open && "sidebar-nav-current",
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-current={holds ? "true" : undefined}
          data-holds-current={holds || undefined}
          onClick={onToggle}
        >
          <span className="truncate">{group.label}</span>
          <DisclosureChevron size={16} />
        </Button>
        <span className="sidebar-nav-icon" aria-hidden="true">
          <GROUP_ICON size={18} strokeWidth={1.75} />
        </span>
      </div>
      <DisclosurePanel id={panelId} open={open} className="sidebar-nav-panel">
        {group.children.map((child) => (
          <LinkRow
            key={child.id}
            option={child}
            current={child.id === current?.id}
            child
          />
        ))}
      </DisclosurePanel>
    </div>
  );
}

/**
 * Every navigation entry as a row. One pill marks the row the page belongs
 * to and glides to the next one; where the page belongs to none, it fades
 * out where it last stood.
 *
 * The pill stands where the row is among the rows on show (`currentRowIndex`):
 * the rows are all as high, so that place is the same on the first paint as
 * later, and a group that opens or closes moves the pill together with the
 * rows under it. A group starts open when it holds the current link; from
 * then on it stays as the reader leaves it while they move between pages.
 */
function Navigation({ navOptions }: { navOptions: Array<NavOption> }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = currentNavLink(navOptions, pathname);
  const [open, setOpen] = useState(() =>
    defaultOpenGroups(navOptions, pathname),
  );
  // The page a group was last opened or closed on: until the page changes,
  // the pill moves with the rows (rail.css).
  const [foldedOn, setFoldedOn] = useState<string | null>(null);
  const row = currentRowIndex(navOptions, open, pathname);
  const lastRow = useRef(Math.max(row, 0));
  if (row >= 0) lastRow.current = row;

  const toggle = (id: string) => {
    setFoldedOn(pathname);
    setOpen((groups) => {
      const next = new Set(groups);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  return (
    <nav
      className="sidebar-nav"
      aria-label={m.nav_main_label()}
      data-fold={foldedOn === pathname}
      style={{ "--sidebar-current": lastRow.current } as CSSProperties}
    >
      <span
        className="sidebar-nav-pill"
        data-shown={row >= 0}
        aria-hidden="true"
      />
      {navOptions.map((option) =>
        isNavGroup(option) ? (
          <GroupRows
            key={option.id}
            group={option}
            current={current}
            open={open.has(option.id)}
            onToggle={() => toggle(option.id)}
          />
        ) : (
          <LinkRow
            key={option.id}
            option={option}
            current={option.id === current?.id}
          />
        ),
      )}
    </nav>
  );
}

/**
 * The account entry: a row that names the visitor (or offers sign-in) and
 * opens the shared account menu above itself.
 */
function Account({ navOptions, user, isLoading, logout }: RailProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { open, present, toggle, close, panelProps } = useMenuPanel(pathname);
  const label = user ? m.profile_title() : m.nav_login_register();

  return (
    <div className="sidebar-account">
      <Button
        variant="plain"
        className="sidebar-account-button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={ACCOUNT_PANEL_ID}
        onClick={(event) => toggle(event.currentTarget, false)}
      >
        {isLoading ? (
          <>
            <Skeleton className="sidebar-account-mark" />
            <Skeleton className="h-3.5 w-16" />
          </>
        ) : (
          <>
            {user?.image ? (
              <img className="sidebar-account-mark" src={user.image} alt="" />
            ) : (
              <span className="sidebar-account-mark">
                <UserIcon size={16} strokeWidth={1.75} />
              </span>
            )}
            <span className="sidebar-account-name">
              {user ? user.name : m.nav_login_register()}
            </span>
            <ChevronsUpDown
              size={14}
              className="sidebar-account-chevron"
              aria-hidden="true"
            />
          </>
        )}
      </Button>
      {present ? (
        <div
          {...panelProps}
          id={ACCOUNT_PANEL_ID}
          className="sidebar-panel sidebar-account-panel fuwari-popover-motion"
        >
          <MobileMenu
            navOptions={navOptions}
            user={user}
            isLoading={isLoading}
            logout={logout}
            mobile={false}
            onClose={close}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The rail: the frame of the site from 1024px, on the left of every page.
 * From the top: the brand; who writes here; search; every navigation entry.
 * At its foot: the social links, then the account entry with the Colour
 * Scheme and language switches. In a window lower than the rail the upper
 * part scrolls by itself and the foot stays where it is.
 *
 * With `tocSlot`, the table of contents of a Post has a place under the
 * navigation; where it shows, who writes here folds away for it.
 */
export function Rail({
  tocSlot,
  ...props
}: RailProps & {
  /** Whether the rail gives the table of contents of a Post its slot. */
  tocSlot: boolean;
}) {
  return (
    <header className="sidebar-rail">
      <div className="sidebar-rail-body">
        <Brand />
        <Identity />
        <SearchEntry />
        <Navigation navOptions={props.navOptions} />
        {tocSlot ? <Contents /> : null}
      </div>
      <div className="sidebar-rail-foot">
        <SocialLinks className="sidebar-socials" />
        <div className="sidebar-tools">
          <Account {...props} />
          <ColourSchemeToggle className="sidebar-tool sidebar-tool-scheme" />
          <LanguageSwitcher className="sidebar-tool sidebar-tool-language" />
        </div>
      </div>
    </header>
  );
}
