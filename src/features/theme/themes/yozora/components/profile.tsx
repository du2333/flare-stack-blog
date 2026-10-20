import { useRouteContext } from "@tanstack/react-router";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";

/**
 * 作者名牌（纸面式）：不再是卡片堆叠。
 * 方形小照 + 衬线名 + 细金线 + 一行描述 + 文字式社交链接。
 * 侧栏用竖排（stack），文章尾注用横排（row）。
 */
export function Profile({
  variant = "stack",
}: {
  variant?: "stack" | "row";
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  const socials = siteConfig.social.filter((link) => link.url);

  return (
    <div className={`yz-sign yz-sign--${variant}`}>
      <span className="yz-sign__avatar">
        <img
          src={siteConfig.theme.fuwari.avatar}
          alt=""
          loading="lazy"
        />
      </span>
      <div className="yz-sign__body">
        <div className="yz-sign__name">{siteConfig.author}</div>
        <div className="yz-sign__rule" aria-hidden="true" />
        <div className="yz-sign__desc">{siteConfig.description}</div>
        {socials.length > 0 && (
          <div className="yz-sign__social">
            {socials.map((link, i) => {
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
                  className="yz-sign__social-link"
                >
                  {Icon ? (
                    <Icon size={13} strokeWidth={1.6} />
                  ) : (
                    <img src={link.icon} alt={label} className="w-3.5 h-3.5" />
                  )}
                  <span>{label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
