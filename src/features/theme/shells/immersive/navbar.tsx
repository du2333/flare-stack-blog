import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { Home, Menu, Search, UserIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { useMenuPanel } from "@/components/layout/use-menu-panel";
import { IconButton, iconButtonClass } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useFirstScreenHeight } from "@/features/theme/components/first-screen";
import { m } from "@/paraglide/messages";

interface NavbarProps {
  navOptions: Array<NavOption>;
  isLoading?: boolean;
  user?: UserInfo;
  logout: () => Promise<void>;
}

const BRAND_MARK_SIZE = 28;
const PANEL_ID = "immersive-navigation-panel";
/**
 * The bar condenses this long before the first screen has scrolled past: its
 * own height, the content's overlap and some air, so the content never
 * slides under the transparent bar. Never sooner than the minimum.
 * `--immersive-condense-at` in immersive.css says the same.
 */
const CONDENSE_BEFORE_PX = 168;
const CONDENSE_MIN_PX = 40;
/** On the way back up it stays condensed this much longer, so it is steady around the line. */
const CONDENSE_SLACK_PX = 32;
/** How far past the line the condensed bar stays before it may hide. */
const HIDE_AFTER_PX = 140;
/** How far the page travels one way before the condensed bar hides or returns. */
const HIDE_TRAVEL_PX = 14;

/** The mark before the title: the built-in icon unless the Site Config picks another. */
function BrandMark() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  if (siteConfig.brandMark === "none") return null;
  const image = resolveBrandMarkImage(siteConfig.brandMark, siteConfig);
  if (!image) {
    return (
      <span className="immersive-brand-mark" data-mark="default">
        <Home size={16} strokeWidth={2} />
      </span>
    );
  }
  return (
    <img
      src={
        image.kind === "avatar"
          ? getPublicImageSrc(image.src, PUBLIC_IMAGE_WIDTH.avatar)
          : image.src
      }
      alt=""
      width={BRAND_MARK_SIZE}
      height={BRAND_MARK_SIZE}
      className="immersive-brand-mark"
      data-mark={image.kind}
    />
  );
}

/**
 * One element in two shapes. Over the banner it is a bar as wide as the
 * page, its text white on a scrim. When the first screen is about to have
 * scrolled past, it condenses into a floating frosted pill, which slides
 * away while the page scrolls down and comes back on the way up.
 *
 * Until the first frames have been painted (`data-ready`), the stylesheet
 * picks the shape from the scroll position where the browser can, so a page
 * reloaded in its middle shows the pill from the start; the shape changes
 * with a transition only after that.
 */
export function Navbar({ user, navOptions, isLoading, logout }: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const firstScreenHeight = useFirstScreenHeight();
  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const { open, mobile, present, toggle, close, panelProps } =
    useMenuPanel(pathname);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  // Two frames, so the shape found below is painted before it may move.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let travel = 0;
    const update = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - previous;
      previous = y;
      const condenseAt = Math.max(
        CONDENSE_MIN_PX,
        firstScreenHeight() - CONDENSE_BEFORE_PX,
      );
      setCondensed((current) =>
        current ? y > condenseAt - CONDENSE_SLACK_PX : y > condenseAt,
      );
      const nav = navRef.current;
      if (
        open ||
        y < condenseAt + HIDE_AFTER_PX ||
        (nav?.contains(document.activeElement) &&
          document.activeElement?.matches(":focus-visible")) ||
        nav?.querySelector('[aria-expanded="true"]')
      ) {
        travel = 0;
        setHidden(false);
        return;
      }
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;
      if (Math.abs(travel) >= HIDE_TRAVEL_PX) {
        setHidden(travel > 0);
        travel = 0;
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // The first screen is a different height on another page.
  }, [firstScreenHeight, open, pathname]);

  const togglePanel = (button: HTMLButtonElement, compact: boolean) => {
    setHidden(false);
    toggle(button, compact);
  };
  const state = condensed ? "pill" : "bar";

  return (
    <>
      <div
        className="immersive-scrim"
        data-state={state}
        data-ready={ready}
        aria-hidden="true"
      />
      <header
        ref={navRef}
        className="immersive-nav"
        data-state={state}
        data-hidden={hidden && !open}
        data-ready={ready}
        data-brand={siteConfig.brandMark}
        onFocusCapture={() => setHidden(false)}
      >
        <div className="immersive-nav-track">
          <div className="immersive-bar">
            <div className="immersive-side immersive-side-start">
              <Link to="/" className="immersive-brand" title={siteConfig.title}>
                <BrandMark />
                <span className="immersive-wordmark">
                  <span>
                    <span>{siteConfig.title}</span>
                  </span>
                </span>
              </Link>
            </div>

            <nav className="immersive-links">
              {navOptions.map((option) => (
                <PublicNavLink
                  key={option.id}
                  option={option}
                  className="immersive-link"
                  activeClassName="immersive-link-active"
                />
              ))}
            </nav>

            <div className="immersive-side immersive-side-end">
              <Link
                to="/search"
                className={iconButtonClass({
                  size: "lg",
                  className: "immersive-search",
                })}
                aria-label={m.nav_search()}
                title={m.nav_search()}
              >
                <Search size={18} strokeWidth={1.75} />
                <span aria-hidden="true">{m.nav_search()}</span>
              </Link>
              <div className="immersive-desktop-tools">
                <ColourSchemeToggle className="immersive-tool immersive-scheme" />
                <LanguageSwitcher className="immersive-tool immersive-language" />
                <IconButton
                  size="lg"
                  className="immersive-tool immersive-account"
                  label={user ? m.profile_title() : m.nav_login_register()}
                  aria-expanded={open && !mobile}
                  aria-controls={PANEL_ID}
                  onClick={(event) => togglePanel(event.currentTarget, false)}
                >
                  {isLoading ? (
                    <Skeleton className="immersive-account-skeleton" />
                  ) : user?.image ? (
                    <img src={user.image} alt="" />
                  ) : (
                    <UserIcon size={18} strokeWidth={1.75} />
                  )}
                </IconButton>
              </div>
              <IconButton
                size="lg"
                className="immersive-tool immersive-menu-trigger"
                label={open && mobile ? m.common_close() : m.common_open_menu()}
                aria-expanded={open && mobile}
                aria-controls={PANEL_ID}
                onClick={(event) => togglePanel(event.currentTarget, true)}
              >
                <span className="immersive-burger" data-open={open && mobile}>
                  <Menu size={20} strokeWidth={1.75} />
                  <X size={20} strokeWidth={1.75} />
                </span>
              </IconButton>
            </div>

            {present && (
              <div
                {...panelProps}
                id={PANEL_ID}
                className="immersive-panel fuwari-popover-motion"
              >
                <MobileMenu
                  navOptions={navOptions}
                  user={user}
                  isLoading={isLoading}
                  logout={logout}
                  mobile={mobile}
                  onClose={close}
                />
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
