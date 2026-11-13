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
import { useBannerFocus } from "@/features/theme/utils/theme-preview-live";
import { useMotionPresence, useReducedMotion } from "@/hooks/use-motion";

/**
 * How long the banner takes from one height to the other, and the headline
 * and a banner that goes to fold away; `--sidebar-resize` in sidebar.css
 * says the same.
 */
const RESIZE_MS = 600;
/**
 * How much longer what has folded stays before it is taken away: its
 * transition starts a few frames after the page kind has changed.
 */
const FOLD_SLACK_MS = 150;

/**
 * What stands above the page (the headline, the banner) comes and goes by
 * folding: `present` says whether it is in the document, `open` whether it
 * has its height. Going, it folds first and is taken away after; coming, it
 * is rendered folded and unfolds from the frame after. What is shown when
 * the shell mounts is open from the first paint.
 *
 * `instant`: no folding. It is there or it is not, in the same commit. For a
 * reader who asked for less motion that is always so.
 */
function useFold(shown: boolean, instant: boolean) {
  const reducedMotion = useReducedMotion();
  const retained = useMotionPresence(shown, RESIZE_MS + FOLD_SLACK_MS);
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
  if (instant || reducedMotion) return { present: shown, open: shown };
  return { present: retained, open: shown && unfolded };
}

interface LeadProps {
  /** Whether the page on screen has it. */
  shown: boolean;
  /** It comes and goes in the commit that says so, without folding. */
  instant: boolean;
  /**
   * The page on screen is being left for one that has none of it and takes
   * over at once (a Post's): it fades with the page, and is gone with it.
   */
  leaving: boolean;
}

/**
 * The tagline as the headline of the home page, above the banner. It has no
 * box where no tagline is set. When the home page is left it folds away
 * while the banner gets lower, and is gone, not hidden, after that; on the
 * way back it unfolds.
 */
export function Headline({ shown, instant, leaving }: LeadProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const has = shown && siteConfig.tagline !== "";
  const { present, open } = useFold(has, instant);
  if (!present || !siteConfig.tagline) return null;
  return (
    <div
      className="sidebar-headline"
      data-shown={open}
      data-leaving={leaving}
      inert={!has}
      aria-hidden={!has}
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
 * (`--sidebar-banner-h`). Nothing lies on the image. Where the page on
 * screen has none it is not in the document, so its image is not asked for;
 * between a page that has it and one that has not it folds as the headline
 * does.
 */
export function Banner({
  ref,
  home,
  shown,
  instant,
  leaving,
}: LeadProps & {
  ref: Ref<HTMLDivElement>;
  home: boolean;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { present, open } = useFold(shown, instant);
  const bannerFocus = useBannerFocus();
  if (!present) return null;
  const centred = isFocalPointCentred(bannerFocus);
  return (
    <div
      ref={ref}
      className="sidebar-banner"
      data-shown={open}
      data-leaving={leaving}
      aria-hidden={!shown || undefined}
    >
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
            : { objectPosition: focalObjectPosition(bannerFocus) }
        }
      />
    </div>
  );
}
