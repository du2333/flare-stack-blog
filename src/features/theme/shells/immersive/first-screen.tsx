import { useRouteContext } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type Ref } from "react";
import { SocialLinks } from "@/components/layout/social-links";
import {
  focalObjectPosition,
  isFocalPointCentred,
} from "@/components/ui/focal-point";
import { IconButton } from "@/components/ui/icon-button";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useFirstScreenHeight } from "@/features/theme/components/first-screen";
import { useBannerFocus } from "@/features/theme/utils/theme-preview-live";
import { useMotionPresence, useReducedMotion } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";

/** How long the introduction takes to fade once the home page is left; first-screen.css. */
const INTRO_FADE_MS = 260;
/**
 * Where the scroll cue leaves the top of what follows the first screen: under
 * the 64px the floating navbar takes, with 12px of air.
 */
const CUE_REST_PX = 76;
/** How far that is above the end of the first screen when nothing can be measured: the content's 56px overlap. */
const CUE_OVERLAP_PX = 56;
const AVATAR_SIZE = 28;
/** How far down the window the navbar reaches, with some air: a line of the introduction above that is under it. */
const NAVBAR_REACH_PX = 80;

/**
 * How far down the page the first thing after the first screen starts:
 * whichever region of the shell stands highest, the cards that lead the
 * content where there are some, or the content. Regions that show nothing
 * have no box. Without a layout to measure, the lower edge of the first
 * screen less the content's overlap.
 */
function contentTop(cue: HTMLElement, firstScreenHeight: number) {
  const tops = [
    ...(cue
      .closest("[data-theme-shell]")
      ?.querySelectorAll(
        '[data-shell-region="main"], [data-shell-region="sidebar"]',
      ) ?? []),
  ]
    .map((region) => region.getBoundingClientRect())
    .filter((box) => box.height > 0)
    .map((box) => box.top + window.scrollY);
  return tops.length > 0
    ? Math.min(...tops)
    : firstScreenHeight - CUE_OVERLAP_PX;
}

/**
 * Takes each line of the introduction away as it scrolls up to the navbar,
 * so none is read through the bar or beside the pill. Where the browser ties
 * the introduction to the scroll position it has faded out by then
 * (first-screen.css); elsewhere, and for a reader who asked for less motion,
 * this is all that happens to it. Written straight to the lines so scrolling
 * does not re-render.
 */
function useLinesClearOfNavbar(present: boolean) {
  const introRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!present) return;
    const clear = () => {
      for (const line of introRef.current?.querySelectorAll(
        ".immersive-rise",
      ) ?? []) {
        const under = line.getBoundingClientRect().top < NAVBAR_REACH_PX;
        if (under !== line.hasAttribute("data-under")) {
          line.toggleAttribute("data-under", under);
        }
      }
    };
    clear();
    window.addEventListener("scroll", clear, { passive: true });
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("scroll", clear);
      window.removeEventListener("resize", clear);
    };
  }, [present]);
  return introRef;
}

/** The place of an element in the entrance order. */
function step(index: number) {
  return { "--immersive-step": index } as CSSProperties;
}

/**
 * The first screen: the banner from edge to edge, tall on the home page and a
 * low band elsewhere. On the home page it introduces the site and its author
 * over a shade: the title, the tagline, the description, then the avatar with
 * the author's name and the social links. That is what the profile card
 * says, so the home page has none (`identityInFirstScreen`). The
 * introduction is gone, not hidden, once the home page is left.
 *
 * With it comes the wash: the same image again, out of focus and faint,
 * fixed behind every page, so the ground of the site has the banner's
 * colours (first-screen.css).
 */
export function FirstScreen({
  gaugeRef,
  home,
}: {
  /** Has the height the banner is on its way to, whatever its transition. */
  gaugeRef: Ref<HTMLDivElement>;
  home: boolean;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const firstScreenHeight = useFirstScreenHeight();
  const reducedMotion = useReducedMotion();
  const present = useMotionPresence(home, INTRO_FADE_MS);
  const introRef = useLinesClearOfNavbar(present);
  const bannerFocus = useBannerFocus();
  const bannerCentred = isFocalPointCentred(bannerFocus);

  return (
    <>
      <div
        ref={gaugeRef}
        className="immersive-first-screen-gauge"
        aria-hidden="true"
      />
      {/* The wash under the whole page: the same file the banner shows, so
          it costs no request of its own. */}
      <div className="immersive-ambient" aria-hidden="true">
        <img
          src={getPublicImageSrc(
            siteConfig.bannerImage,
            PUBLIC_IMAGE_WIDTH.banner,
          )}
          alt=""
          decoding="async"
        />
      </div>
      <section className="immersive-first-screen" data-home={home}>
        <div className="immersive-banner">
          <img
            src={getPublicImageSrc(
              siteConfig.bannerImage,
              PUBLIC_IMAGE_WIDTH.banner,
            )}
            alt="banner"
            fetchPriority={home ? "high" : "auto"}
            style={
              bannerCentred
                ? undefined
                : {
                    objectPosition: focalObjectPosition(bannerFocus),
                  }
            }
          />
        </div>
        <div className="immersive-shade" aria-hidden="true" />
        {present ? (
          <div
            ref={introRef}
            className="immersive-intro"
            inert={!home}
            aria-hidden={!home}
          >
            <div className="immersive-intro-inner">
              <div className="immersive-intro-text">
                <h1 className="immersive-title immersive-rise" style={step(0)}>
                  {siteConfig.title}
                </h1>
                {siteConfig.tagline ? (
                  <p
                    className="immersive-tagline immersive-rise"
                    style={step(1)}
                  >
                    {siteConfig.tagline}
                  </p>
                ) : null}
                {siteConfig.description ? (
                  <p
                    className="immersive-description immersive-rise"
                    style={step(2)}
                  >
                    {siteConfig.description}
                  </p>
                ) : null}
                <div
                  className="immersive-author immersive-rise"
                  style={step(3)}
                >
                  <span className="immersive-author-chip">
                    <img
                      src={getPublicImageSrc(
                        siteConfig.avatar,
                        PUBLIC_IMAGE_WIDTH.avatar,
                      )}
                      alt=""
                      width={AVATAR_SIZE}
                      height={AVATAR_SIZE}
                    />
                    <span>{siteConfig.author}</span>
                  </span>
                  <SocialLinks className="immersive-socials" />
                </div>
              </div>
              <IconButton
                size="lg"
                className="immersive-cue immersive-rise"
                style={step(4)}
                label={m.theme_immersive_scroll_down()}
                onClick={(event) =>
                  window.scrollTo({
                    top: Math.max(
                      0,
                      contentTop(event.currentTarget, firstScreenHeight()) -
                        CUE_REST_PX,
                    ),
                    behavior: reducedMotion ? "auto" : "smooth",
                  })
                }
              >
                <ArrowDown size={18} strokeWidth={1.75} />
              </IconButton>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
