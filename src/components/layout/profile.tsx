import { Link, useRouteContext } from "@tanstack/react-router";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import { m } from "@/paraglide/messages";

export function Profile() {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <div className="fuwari-card-base p-4">
      <Link
        to="/"
        className="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-hidden rounded-xl active:scale-95"
        aria-label={m.profile_avatar_label()}
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/30 group-active:bg-black/50 transition-colors pointer-events-none" />
        <img
          src={siteConfig.theme.fuwari.avatar}
          alt=""
          className="w-full h-auto aspect-square object-cover"
        />
      </Link>
      <div className="px-2 text-center">
        <div className="font-bold text-xl fuwari-text-90 mb-1">
          {siteConfig.author}
        </div>
        <div
          className="h-1 w-5 rounded-full mx-auto mb-2"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        <div className="fuwari-text-50 text-sm mb-2.5">
          {siteConfig.description}
        </div>
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
                  className="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-colors"
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
