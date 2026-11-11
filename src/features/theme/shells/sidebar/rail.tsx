import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { ChevronsUpDown, Search, UserIcon } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { SocialLinks } from "@/components/layout/social-links";
import { useMenuPanel } from "@/components/layout/use-menu-panel";
import { Button, buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Brand } from "./brand";
import { currentEntryIndex, entryIcon } from "./nav-entry";

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
 * rail shows (sidebar.css).
 */
function Identity() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  return (
    <div className="sidebar-identity">
      <Link
        to="/"
        className="sidebar-avatar"
        aria-label={m.profile_avatar_label()}
      >
        <img
          src={getPublicImageSrc(siteConfig.avatar, PUBLIC_IMAGE_WIDTH.avatar)}
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

/**
 * Every navigation entry as a row led by an icon. One pill marks the entry
 * the page belongs to and glides to the next one; where the page belongs to
 * none, it fades out where it last stood.
 */
function Navigation({ navOptions }: { navOptions: Array<NavOption> }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = currentEntryIndex(navOptions, pathname);
  const lastCurrent = useRef(Math.max(current, 0));
  if (current >= 0) lastCurrent.current = current;

  return (
    <nav
      className="sidebar-nav"
      aria-label={m.nav_main_label()}
      style={{ "--sidebar-current": lastCurrent.current } as CSSProperties}
    >
      <span
        className="sidebar-nav-pill"
        data-shown={current >= 0}
        aria-hidden="true"
      />
      {navOptions.map((option, index) => {
        const Icon = entryIcon(option);
        return (
          <div key={option.id} className="sidebar-nav-row">
            <PublicNavLink
              option={option}
              className={cn(
                "sidebar-nav-link",
                index === current && "sidebar-nav-current",
              )}
            />
            <span className="sidebar-nav-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.75} />
            </span>
          </div>
        );
      })}
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
 */
export function Rail(props: RailProps) {
  return (
    <header className="sidebar-rail">
      <div className="sidebar-rail-body">
        <Brand />
        <Identity />
        <SearchEntry />
        <Navigation navOptions={props.navOptions} />
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
