import { Link, useRouteContext } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, Ref } from "react";
import { SocialLinks } from "@/components/layout/social-links";
import { buttonClass } from "@/components/ui/button";
import {
  focalObjectPosition,
  isFocalPointCentred,
} from "@/components/ui/focal-point";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useMotionPresence } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";

/** How long the first screen takes to fold away; `--namecard-fold` in first-screen.css. */
const FOLD_MS = 640;
/** Stands in for the author while the greeting is split around the name. */
const NAME_SLOT = "%author%";

/** The place of an element in the entrance order. */
function step(index: number) {
  return { "--namecard-step": index } as CSSProperties;
}

/**
 * The first screen: a greeting, the tagline, the site description and the
 * social links beside the banner in a frame, with the avatar as a seal on its
 * corner. Open on the home page only; it stays mounted elsewhere, folded to
 * nothing, so leaving the home page folds it away and coming back unfolds it.
 * The text is gone once it is folded.
 */
export function FirstScreen({
  ref,
  open,
}: {
  ref: Ref<HTMLElement>;
  open: boolean;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const present = useMotionPresence(open, FOLD_MS);
  const bannerCentred = isFocalPointCentred(siteConfig.bannerFocus);
  const [beforeName, afterName] = m
    .theme_namecard_greeting_name({ author: NAME_SLOT })
    .split(NAME_SLOT);

  return (
    <section
      ref={ref}
      className="namecard-first-screen"
      data-open={open}
      inert={!open}
      aria-hidden={!open}
    >
      <div className="namecard-first-screen-clip">
        <div className="namecard-first-screen-inner">
          {present ? (
            <div className="namecard-lede">
              <p className="namecard-kicker namecard-rise" style={step(0)}>
                <span aria-hidden="true" />
                {m.theme_namecard_kicker()}
              </p>
              <h1 className="namecard-greeting namecard-rise" style={step(1)}>
                <span className="namecard-greeting-hello">
                  {m.theme_namecard_greeting_hello()}
                </span>
                <span>
                  {beforeName}
                  <em>{siteConfig.author}</em>
                  {afterName}
                </span>
              </h1>
              {siteConfig.tagline ? (
                <p className="namecard-tagline namecard-rise" style={step(2)}>
                  {siteConfig.tagline}
                </p>
              ) : null}
            </div>
          ) : null}

          <figure className="namecard-art">
            <span className="namecard-art-block" aria-hidden="true" />
            <div className="namecard-art-frame">
              <img
                src={getPublicImageSrc(
                  siteConfig.bannerImage,
                  PUBLIC_IMAGE_WIDTH.banner,
                )}
                alt="banner"
                fetchPriority={open ? "high" : "auto"}
                style={
                  bannerCentred
                    ? undefined
                    : {
                        objectPosition: focalObjectPosition(
                          siteConfig.bannerFocus,
                        ),
                      }
                }
              />
            </div>
            {/* As the brand mark, the avatar is already in the navbar. */}
            {siteConfig.brandMark === "avatar" ? null : (
              <img
                className="namecard-art-seal"
                src={getPublicImageSrc(
                  siteConfig.avatar,
                  PUBLIC_IMAGE_WIDTH.avatar,
                )}
                alt=""
                width={72}
                height={72}
              />
            )}
          </figure>

          {present ? (
            <div className="namecard-about">
              <p className="namecard-description namecard-rise" style={step(3)}>
                {siteConfig.description}
              </p>
              <div className="namecard-actions namecard-rise" style={step(4)}>
                <Link
                  to="/posts"
                  className={buttonClass({
                    variant: "primary",
                    size: "lg",
                    className: "namecard-cta",
                  })}
                >
                  {m.theme_namecard_read_posts()}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
                <SocialLinks className="namecard-socials" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
