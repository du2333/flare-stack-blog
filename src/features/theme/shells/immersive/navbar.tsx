import {
  Link,
  useLocation,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { Home, Menu, Search, UserIcon, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
import { useFirstScreenHeight } from "@/features/theme/components/first-screen";
import { useReducedMotion } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { Glider } from "./glide";

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
/** How long the page has been at rest before a bar that moved up may condense. */
const SETTLE_MS = 160;
/** How far past the line the condensed bar stays before it may hide. */
const HIDE_AFTER_PX = 140;
/** How far the page travels one way before the condensed bar hides or returns. */
const HIDE_TRAVEL_PX = 14;
/**
 * How the parts of the bar glide from one shape to the other;
 * `--immersive-morph` and `--immersive-ease` in immersive.css say the same.
 */
const MORPH = { duration: 560, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
/** The parts whose `::before` is the surface they draw (navbar.css). */
const SURFACES = ".immersive-bar, .immersive-search";
/** The trigger of a group's menu, open. */
const OPEN_GROUP = '.immersive-group[aria-expanded="true"]';

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
 * A shape is a layout, which changes at once; the parts then glide from
 * where they were (glide.ts), so the change is not one the browser counts
 * as layout shift. The pill slides away and back the same way.
 *
 * Until the first frames have been painted (`data-ready`), the stylesheet
 * picks the shape from the scroll position where the browser can, so a page
 * reloaded in its middle shows the pill from the start; the shape changes
 * with a transition only after that.
 */
export function Navbar({ user, navOptions, isLoading, logout }: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const router = useRouter();
  const firstScreenHeight = useFirstScreenHeight();
  // Null until the scroll position has been looked at, in the browser.
  const [condensed, setCondensed] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const { open, mobile, present, toggle, close, panelProps } =
    useMenuPanel(pathname);
  const reducedMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // The shape and whether it is hidden, as last asked for; the state follows
  // through the glider, a frame later while something is still gliding.
  const shape = useRef<boolean | null>(null);
  const away = useRef(false);
  const [glider] = useState(
    () => new Glider(() => barRef.current, SURFACES, MORPH),
  );
  // Not before the first frames, and not for a reader who asked for less
  // motion: then a change is made at once.
  const glides = useRef(false);
  glides.current = ready && !reducedMotion;
  useLayoutEffect(() => glider.carry());
  useEffect(() => () => glider.end(), [glider]);

  // A group's menu stands below its trigger, where the bar was: when the bar
  // changes shape it closes, the groups being mounted afresh in the commit
  // that changes it. A new trigger is carried with the links around it. The
  // focus that was on an open group or in its menu goes to its new trigger.
  const [groupsMount, setGroupsMount] = useState(0);
  const refocusGroup = useRef(-1);
  const closeGroups = useCallback(() => {
    const triggers = [
      ...(navRef.current?.querySelectorAll<HTMLElement>(".immersive-group") ??
        []),
    ];
    const open = triggers.filter((trigger) => trigger.matches(OPEN_GROUP));
    if (open.length === 0) return;
    const focused = document.activeElement;
    refocusGroup.current = triggers.findIndex(
      (trigger) =>
        open.includes(trigger) &&
        focused !== null &&
        (trigger.contains(focused) ||
          document
            .getElementById(trigger.getAttribute("aria-controls") ?? "")
            ?.contains(focused)),
    );
    setGroupsMount((count) => count + 1);
  }, []);
  useLayoutEffect(() => {
    const index = refocusGroup.current;
    refocusGroup.current = -1;
    if (index < 0) return;
    navRef.current
      ?.querySelectorAll<HTMLElement>(".immersive-group")
      [index]?.focus({ preventScroll: true });
  }, [groupsMount]);
  // While the parts glide, a trigger slides under a pointer that rests on
  // the bar and would open its menu there, beside a trigger still on its
  // way: the groups take no pointer until the glide is over (navbar.css).
  const [gliding, setGliding] = useState(false);
  const glideEnd = useRef(0);
  const glideFor = useCallback(() => {
    window.clearTimeout(glideEnd.current);
    setGliding(true);
    glideEnd.current = window.setTimeout(
      () => setGliding(false),
      MORPH.duration,
    );
  }, []);
  useEffect(() => () => window.clearTimeout(glideEnd.current), []);

  const hide = useCallback(
    (next: boolean) => {
      if (next === away.current) return;
      away.current = next;
      glider.change(() => setHidden(next), glides.current);
    },
    [glider],
  );

  useEffect(() => {
    hide(false);
  }, [hide, pathname]);

  // Two frames after the shape for this scroll position has been rendered, so
  // it is painted before it may move. React can hold that first render back
  // behind the rest of hydration, hence not two frames after mounting.
  const measured = condensed !== null;
  useEffect(() => {
    if (!measured) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [measured]);

  const condenseAt = useCallback(
    () => Math.max(CONDENSE_MIN_PX, firstScreenHeight() - CONDENSE_BEFORE_PX),
    [firstScreenHeight],
  );

  // The shape. Past the line it is the pill, but a page on its way up is not
  // condensed before it has come to rest: after a navigation the router
  // takes the page to the top, past a line that lies higher on a page with a
  // lower banner, and the bar must not flicker into a pill on the way.
  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let settling = 0;
    const measure = (rising = false) => {
      const y = Math.max(0, window.scrollY);
      const line = condenseAt();
      const next = shape.current
        ? y > line - CONDENSE_SLACK_PX
        : !rising && y > line;
      if (next === shape.current) return;
      // The first shape is simply the one the page is loaded in.
      const first = shape.current === null;
      shape.current = next;
      const glide = !first && glides.current;
      glider.change(() => {
        closeGroups();
        if (glide) glideFor();
        setCondensed(next);
      }, glide);
    };
    const settle = () => {
      window.clearTimeout(settling);
      settling = window.setTimeout(measure, SETTLE_MS);
    };
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const rising = y < previous;
      previous = y;
      measure(rising);
      if (rising) settle();
    };
    const onResize = () => measure();
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // A new page may leave the scroll position where it is.
    const unsubscribe = router.subscribe("onRendered", settle);
    return () => {
      window.clearTimeout(settling);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      unsubscribe();
    };
  }, [closeGroups, condenseAt, glideFor, glider, router]);

  // Hiding: well past the line, the pill follows the direction of the scroll,
  // unless it is in use.
  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let travel = 0;
    const follow = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - previous;
      previous = y;
      const nav = navRef.current;
      if (
        open ||
        y < condenseAt() + HIDE_AFTER_PX ||
        (nav?.contains(document.activeElement) &&
          document.activeElement?.matches(":focus-visible")) ||
        nav?.querySelector('[aria-expanded="true"]')
      ) {
        travel = 0;
        hide(false);
        return;
      }
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;
      if (Math.abs(travel) >= HIDE_TRAVEL_PX) {
        hide(travel > 0);
        travel = 0;
      }
    };
    window.addEventListener("scroll", follow, { passive: true });
    return () => window.removeEventListener("scroll", follow);
  }, [condenseAt, hide, open]);

  const togglePanel = (button: HTMLButtonElement, compact: boolean) => {
    hide(false);
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
        data-gliding={gliding || undefined}
        data-brand={siteConfig.brandMark}
        onFocusCapture={() => hide(false)}
      >
        <div className="immersive-nav-track">
          <div ref={barRef} className="immersive-bar">
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

            <nav className="immersive-links" aria-label={m.nav_main_label()}>
              {navOptions.map((option) =>
                isNavGroup(option) ? (
                  <NavGroupMenu
                    key={`${option.id}:${groupsMount}`}
                    group={option}
                    navOptions={navOptions}
                    className="immersive-link immersive-group"
                    activeClassName="immersive-link-active"
                  />
                ) : (
                  <PublicNavLink
                    key={option.id}
                    option={option}
                    className="immersive-link"
                    activeClassName="immersive-link-active"
                  />
                ),
              )}
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
