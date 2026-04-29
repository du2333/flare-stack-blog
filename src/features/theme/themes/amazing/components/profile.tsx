import { Link, useRouteContext } from "@tanstack/react-router";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import { m } from "@/paraglide/messages";

/**
 * Enhanced Profile Card — Amazing Theme
 *
 * Features:
 * - Conic gradient spinning ring around avatar (amazing-rotate-hue)
 * - Hover to accelerate ring + scale avatar
 * - Social icons with individual hover glow
 * - Subtle float animation on card
 */
export function Profile() {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <div className="fuwari-card-base p-4 hover:shadow-lg transition-shadow duration-300">
      {/* Avatar with spinning glow ring */}
      <Link
        to="/"
        className="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-visible rounded-xl active:scale-95"
        aria-label={m.profile_avatar_label()}
      >
        <div className="relative amazing-avatar-ring rounded-xl overflow-hidden">
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-500 pointer-events-none" />
          <img
            src={siteConfig.theme.fuwari.avatar}
            alt=""
            className="w-full h-auto aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="px-2 text-center">
        <div className="font-bold text-xl fuwari-text-90 mb-1 transition-colors">
          {siteConfig.author}
        </div>
        <div
          className="h-1 w-8 rounded-full mx-auto mb-2 transition-all duration-300 hover:w-12"
          style={{
            background: `linear-gradient(90deg, rgb(var(--amazing-primary-rgb)), rgb(var(--amazing-accent-rgb)))`,
          }}
        />
        <div className="fuwari-text-50 text-sm mb-2.5">
          {siteConfig.description}
        </div>

        {/* Social icons with glow hover */}
        <div className="flex flex-wrap gap-2 justify-center">
          {siteConfig.social
            .filter((link) => link.url)
            .map((link, i) => {
              const preset =
                link.platform !== "custom"
                  ? SOCIAL_PLATFORMS[link.platform]
                  : null;
              const Icon = preset?.icon;
              const label = preset?.label ?? link.label ?? "";
              const href = resolveSocialHref(link.platform, link.url);

              return (
                <a
                  key={`${link.platform}-${i}`}
                  href={href}
                  target={link.platform === "email" ? undefined : "_blank"}
                  rel={link.platform === "email" ? undefined : "me noreferrer"}
                  aria-label={label}
                  className="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-all duration-300 hover:shadow-[0_0_16px_rgba(var(--amazing-primary-rgb),0.2)] hover:scale-110"
                >
                  {Icon ? (
                    <Icon size={20} strokeWidth={1.5} />
                  ) : (
                    <img src={link.icon} alt={label} className="w-5 h-5" />
                  )}
                </a>
              );
            })}
        </div>
      </div>
    </div>
  );
}
