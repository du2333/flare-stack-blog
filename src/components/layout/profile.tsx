import { Link, useRouteContext } from "@tanstack/react-router";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { SocialLinks } from "./social-links";

/**
 * The profile card, in two forms on one markup. Narrow: the avatar over the
 * centred name, description and social links. Wide (in a `card` container
 * from 20rem): low, the avatar small at the start, the name over the
 * description in full, the social links under them and, from 32rem, at the
 * far end where one line holds them.
 */
export function Profile() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { headingAccent } = useThemeRecipe();

  return (
    <div className="fuwari-card-base fuwari-card-widget py-4 px-(--theme-widget-pad-x,1rem) @xs/card:flex @xs/card:flex-wrap @xs/card:items-center @xs/card:gap-x-4 @xs/card:gap-y-2 @xs/card:px-(--theme-widget-pad-x,1.25rem)">
      <Link
        to="/"
        className="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-hidden rounded-xl active:scale-95 @xs/card:mx-0 @xs/card:mb-0 @xs/card:w-16 @xs/card:shrink-0"
        aria-label={m.profile_avatar_label()}
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent group-hover:bg-(--fuwari-scrim-hover) group-active:bg-(--fuwari-scrim-active) transition-colors pointer-events-none" />
        <img
          src={getPublicImageSrc(siteConfig.avatar, PUBLIC_IMAGE_WIDTH.avatar)}
          alt=""
          className="w-full h-auto aspect-square object-cover"
        />
      </Link>
      <div className="px-2 text-center @xs/card:min-w-0 @xs/card:flex-1 @xs/card:basis-44 @xs/card:px-0 @xs/card:text-left">
        <div
          className={cn(
            "font-bold text-xl fuwari-text-90 @xs/card:mb-0 @xs/card:text-lg",
            headingAccent === "on" ? "mb-1" : "mb-3",
          )}
        >
          {siteConfig.author}
        </div>
        {headingAccent === "on" ? (
          <div
            className="h-1 w-5 rounded-full mx-auto mb-2 @xs/card:hidden"
            style={{ backgroundColor: "var(--theme-accent)" }}
          />
        ) : null}
        <div className="fuwari-text-50 text-sm mb-2.5 @xs/card:mb-0">
          {siteConfig.description}
        </div>
      </div>
      <SocialLinks className="flex flex-wrap gap-2 justify-center px-2 @xs/card:-mx-2 @xs/card:max-w-full @xs/card:shrink-0 @xs/card:basis-full @xs/card:justify-start @xs/card:gap-0 @xs/card:px-0 @xs/card:empty:hidden @lg/card:basis-auto" />
    </div>
  );
}
