import { useRouteContext } from "@tanstack/react-router";
import { iconButtonClass } from "@/components/ui/icon-button";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";

/** The Site Config social links that have an address, as icon buttons in a row. */
export function SocialLinks({ className }: { className?: string }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <div className={className}>
      {siteConfig.social
        .filter((link) => link.url)
        .map((link, i) => {
          const preset =
            link.platform !== "custom" ? SOCIAL_PLATFORMS[link.platform] : null;
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
              className={iconButtonClass({ size: "lg" })}
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
  );
}
