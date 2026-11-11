import { useRouteContext } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import type { CSSProperties, Ref } from "react";
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
import { useMotionPresence, useReducedMotion } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";

/** How long the introduction takes to fade once the home page is left; first-screen.css. */
const INTRO_FADE_MS = 260;
/**
 * Where the scroll cue stops short of the end of the first screen: the
 * content's 56px overlap, the 64px the floating navbar takes and 12px of air,
 * so the content starts right under the navbar.
 */
const CUE_REST_PX = 132;
const AVATAR_SIZE = 28;

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
  const bannerCentred = isFocalPointCentred(siteConfig.bannerFocus);

  return (
    <>
      <div
        ref={gaugeRef}
        className="immersive-first-screen-gauge"
        aria-hidden="true"
      />
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
                    objectPosition: focalObjectPosition(siteConfig.bannerFocus),
                  }
            }
          />
        </div>
        <div className="immersive-shade" aria-hidden="true" />
        {present ? (
          <div className="immersive-intro" inert={!home} aria-hidden={!home}>
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
                onClick={() =>
                  window.scrollTo({
                    top: Math.max(0, firstScreenHeight() - CUE_REST_PX),
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
