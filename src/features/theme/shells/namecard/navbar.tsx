import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { ChevronDown, Home, Menu, Search, UserIcon, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavGroupMenu } from "@/components/layout/nav-group-menu";
import { isNavGroup } from "@/components/layout/nav-options";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { useMenuPanel } from "@/components/layout/use-menu-panel";
import { IconButton, iconButtonClass } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { m } from "@/paraglide/messages";

interface NavbarProps {
  navOptions: Array<NavOption>;
  isLoading?: boolean;
  user?: UserInfo;
  logout: () => Promise<void>;
}

const BRAND_MARK_SIZE = 28;
const PANEL_ID = "namecard-navigation-panel";
/** The bar gains its tint once the page has scrolled this far. */
const SCROLLED_AFTER_PX = 6;

/** The mark before the title: the built-in icon unless the Site Config picks another. */
function BrandMark() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  if (siteConfig.brandMark === "none") return null;
  const image = resolveBrandMarkImage(siteConfig.brandMark, siteConfig);
  if (!image) {
    return (
      <span className="namecard-brand-mark" data-mark="default">
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
      className="namecard-brand-mark"
      data-mark={image.kind}
    />
  );
}

/**
 * A bare bar: the wordmark, text links and the tools sit on the page itself.
 * It stays at the top and gains a tint, a blur and a hairline once content
 * passes under it. Below 960px the links and the tools are the compact menu,
 * a page of its own under the bar (navbar.css).
 */
export function Navbar({ user, navOptions, isLoading, logout }: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const { open, mobile, present, toggle, close, panelProps } = useMenuPanel(
    pathname,
    { coversPage: true },
  );

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLLED_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="namecard-nav" data-scrolled={scrolled || open}>
      <div className="namecard-nav-inner">
        <Link to="/" className="namecard-brand" title={siteConfig.title}>
          <BrandMark />
          <span>{siteConfig.title}</span>
        </Link>

        <NavLinks navOptions={navOptions} pathname={pathname} />

        <div className="namecard-tools">
          <Link
            to="/search"
            className={iconButtonClass({
              size: "lg",
              className: "namecard-tool",
            })}
            aria-label={m.nav_search()}
            title={m.nav_search()}
          >
            <Search size={18} strokeWidth={1.75} />
          </Link>
          <div className="namecard-desktop-tools">
            <ColourSchemeToggle className="namecard-tool" />
            <LanguageSwitcher className="namecard-tool namecard-tool-wide" />
            <IconButton
              size="lg"
              className="namecard-tool namecard-tool-wide namecard-account"
              label={user ? m.profile_title() : m.nav_login_register()}
              aria-expanded={open && !mobile}
              aria-controls={PANEL_ID}
              onClick={(event) => toggle(event.currentTarget, false)}
            >
              {isLoading ? (
                <Skeleton className="w-6.5 h-6.5 rounded-full" />
              ) : user?.image ? (
                <img src={user.image} alt="" />
              ) : (
                <UserIcon size={18} strokeWidth={1.75} />
              )}
              <ChevronDown size={12} className="namecard-chevron" />
            </IconButton>
          </div>
          <IconButton
            size="lg"
            className="namecard-tool namecard-menu-trigger"
            label={open && mobile ? m.common_close() : m.common_open_menu()}
            aria-expanded={open && mobile}
            aria-controls={PANEL_ID}
            onClick={(event) => toggle(event.currentTarget, true)}
          >
            <span className="namecard-burger" data-open={open && mobile}>
              <Menu size={20} strokeWidth={1.75} />
              <X size={20} strokeWidth={1.75} />
            </span>
          </IconButton>
        </div>

        {present && (
          <div
            {...panelProps}
            id={PANEL_ID}
            className="namecard-panel fuwari-popover-motion"
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
    </header>
  );
}

/**
 * Text links sharing one underline: it rests under the current page and
 * glides to the link under the pointer or the keyboard focus. Until it has
 * been measured, the current link draws its own, so the server-rendered page
 * already shows it.
 */
function NavLinks({
  navOptions,
  pathname,
}: {
  navOptions: Array<NavOption>;
  pathname: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const pointed = useRef<HTMLElement | null>(null);
  const [bar, setBar] = useState<{ x: number; width: number } | null>(null);
  const [phase, setPhase] = useState<"static" | "placed" | "gliding">("static");

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    // The link under the pointer or the keyboard; else the group whose menu
    // is open, which the pointer may have left for the menu; else the page's.
    const target =
      (pointed.current?.isConnected ? pointed.current : null) ??
      nav.querySelector<HTMLElement>('.namecard-link[aria-expanded="true"]') ??
      nav.querySelector<HTMLElement>(".namecard-link-active");
    if (!target) {
      setBar(null);
      return;
    }
    const label = target.querySelector<HTMLElement>("span") ?? target;
    const box = label.getBoundingClientRect();
    const origin = nav.getBoundingClientRect();
    setBar({ x: box.left - origin.left, width: box.width });
  }, []);

  useEffect(() => {
    measure();
    setPhase("placed");
    // Place it first, glide from the next frame on.
    const frame = requestAnimationFrame(() => setPhase("gliding"));
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  useEffect(() => {
    measure();
  }, [measure, pathname, navOptions]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [measure]);

  // A group's menu opening or closing moves the underline onto the group or
  // back (the menu belongs to the group's trigger, which says so).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(measure);
    observer.observe(nav, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
      subtree: true,
    });
    return () => observer.disconnect();
  }, [measure]);

  const point = (target: EventTarget | null) => {
    pointed.current =
      target instanceof Element
        ? target.closest<HTMLElement>(".namecard-link")
        : null;
    measure();
  };

  return (
    <nav
      ref={navRef}
      className="namecard-links"
      aria-label={m.nav_main_label()}
      data-bar={phase}
      onPointerOver={(event) => {
        if (event.pointerType === "mouse") point(event.target);
      }}
      onPointerLeave={() => point(null)}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) point(event.target);
      }}
      onBlur={() => point(null)}
    >
      {navOptions.map((option) =>
        isNavGroup(option) ? (
          <NavGroupMenu
            key={option.id}
            group={option}
            navOptions={navOptions}
            className="namecard-link"
            activeClassName="namecard-link-active"
          />
        ) : (
          <PublicNavLink
            key={option.id}
            option={option}
            className="namecard-link"
            activeClassName="namecard-link-active"
          />
        ),
      )}
      <span
        className="namecard-link-bar"
        aria-hidden="true"
        data-visible={bar !== null}
        style={
          bar
            ? ({
                "--namecard-bar-x": `${bar.x}px`,
                "--namecard-bar-width": `${bar.width}px`,
              } as CSSProperties)
            : undefined
        }
      />
    </nav>
  );
}
