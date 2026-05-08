import { useRouteContext } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import type { ContactPageProps } from "@/features/theme/contract/pages";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import { m } from "@/paraglide/messages";

export function ContactPage(_: ContactPageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const siteName = siteConfig.title;

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.contact_heading()}
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          {m.contact_intro({ siteName })}
        </p>
      </header>

      <div className="space-y-8">
        {siteConfig.social.filter((link) => link.url).length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-foreground mb-4">
              {m.contact_social_label()}
            </h2>
            <div className="space-y-3">
              {siteConfig.social
                .filter((link) => link.url)
                .map((link, i) => {
                  const href = resolveSocialHref(link.platform, link.url);
                  const label =
                    link.platform !== "custom"
                      ? SOCIAL_PLATFORMS[link.platform].label
                      : (link.label ?? link.url);
                  const platformInfo =
                    link.platform !== "custom"
                      ? SOCIAL_PLATFORMS[link.platform]
                      : null;

                  return (
                    <a
                      key={`${link.platform}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.platform === "email" ? (
                        <Mail size={18} />
                      ) : platformInfo ? (
                        <platformInfo.icon size={18} />
                      ) : (
                        <Mail size={18} />
                      )}
                      <span className="text-sm">{label}</span>
                    </a>
                  );
                })}
            </div>
          </section>
        )}

        <div className="pt-6 border-t border-border/40">
          <p className="text-sm text-muted-foreground font-light">
            {m.contact_response_hint()}
          </p>
        </div>
      </div>
    </div>
  );
}
