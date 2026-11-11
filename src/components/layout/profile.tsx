import { Link, useRouteContext } from "@tanstack/react-router";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { SocialLinks } from "./social-links";

export function Profile() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { headingAccent } = useThemeRecipe();

  return (
    <div className="fuwari-card-base fuwari-card-widget py-4 px-(--theme-widget-pad-x,1rem)">
      <Link
        to="/"
        className="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-hidden rounded-xl active:scale-95"
        aria-label={m.profile_avatar_label()}
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent group-hover:bg-(--fuwari-scrim-hover) group-active:bg-(--fuwari-scrim-active) transition-colors pointer-events-none" />
        <img
          src={getPublicImageSrc(siteConfig.avatar, PUBLIC_IMAGE_WIDTH.avatar)}
          alt=""
          className="w-full h-auto aspect-square object-cover"
        />
      </Link>
      <div className="px-2 text-center">
        <div
          className={cn(
            "font-bold text-xl fuwari-text-90",
            headingAccent === "on" ? "mb-1" : "mb-3",
          )}
        >
          {siteConfig.author}
        </div>
        {headingAccent === "on" ? (
          <div
            className="h-1 w-5 rounded-full mx-auto mb-2"
            style={{ backgroundColor: "var(--theme-accent)" }}
          />
        ) : null}
        <div className="fuwari-text-50 text-sm mb-2.5">
          {siteConfig.description}
        </div>
        <SocialLinks className="flex flex-wrap gap-2 justify-center" />
      </div>
    </div>
  );
}
