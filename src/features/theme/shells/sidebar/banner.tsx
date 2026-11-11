import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useState, type Ref } from "react";
import {
  focalObjectPosition,
  isFocalPointCentred,
} from "@/components/ui/focal-point";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useMotionPresence, useReducedMotion } from "@/hooks/use-motion";

/**
 * How long the banner takes from one height to the other, and the headline
 * to fold away with it; `--sidebar-resize` in sidebar.css says the same.
 */
const RESIZE_MS = 600;
/**
 * How much longer the folded headline stays before it is taken away: its
 * transition starts a few frames after the page kind has changed.
 */
const FOLD_SLACK_MS = 150;

/**
 * The tagline as the headline of the home page, above the banner. It has no
 * box where no tagline is set. When the home page is left it folds away
 * while the banner gets lower, and is gone, not hidden, after that; on the
 * way back it unfolds, from the frame after it has been rendered folded. A
 * page that loads as the home page has it open from the first paint, and so
 * has a reader who asked for less motion.
 */
export function Headline({ home }: { home: boolean }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const shown = home && siteConfig.tagline !== "";
  const reducedMotion = useReducedMotion();
  const present = useMotionPresence(shown, RESIZE_MS + FOLD_SLACK_MS);
  const [unfolded, setUnfolded] = useState(shown);
  useEffect(() => {
    if (!shown) {
      setUnfolded(false);
      return;
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setUnfolded(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [shown]);
  if (!present || !siteConfig.tagline) return null;
  const open = shown && (unfolded || reducedMotion);
  return (
    <div
      className="sidebar-headline"
      data-shown={open}
      inert={!shown}
      aria-hidden={!shown}
    >
      <div>
        <h1>{siteConfig.tagline}</h1>
      </div>
    </div>
  );
}

/**
 * The banner as a rounded band at the top of the content column, cropped
 * around its focal point: tall on the home page, low elsewhere
 * (`--sidebar-banner-h`). Nothing lies on the image.
 */
export function Banner({
  ref,
  home,
}: {
  ref: Ref<HTMLDivElement>;
  home: boolean;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const centred = isFocalPointCentred(siteConfig.bannerFocus);
  return (
    <div ref={ref} className="sidebar-banner">
      <img
        src={getPublicImageSrc(
          siteConfig.bannerImage,
          PUBLIC_IMAGE_WIDTH.banner,
        )}
        alt="banner"
        fetchPriority={home ? "high" : "auto"}
        style={
          centred
            ? undefined
            : { objectPosition: focalObjectPosition(siteConfig.bannerFocus) }
        }
      />
    </div>
  );
}
