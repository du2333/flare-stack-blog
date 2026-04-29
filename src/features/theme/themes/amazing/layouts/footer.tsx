import { ClientOnly, useRouteContext } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { NavOption } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

interface FooterProps {
  navOptions: Array<NavOption>;
}

/**
 * Enhanced Footer — Amazing Theme
 *
 * Features:
 * - Gradient flowing divider line
 * - Breathing glow links
 * - Heart icon with pulse animation
 * - Subtle entrance animation
 */
export function Footer(_: FooterProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Gradient flowing divider */}
      <div className="relative my-10 mx-4 md:mx-32 h-px overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-(--fuwari-primary)/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-(--fuwari-primary)/50 to-transparent amazing-shimmer-bg" />
      </div>

      <div className="rounded-2xl mb-12 flex flex-col items-center justify-center px-6 py-8">
        <div className="fuwari-text-50 text-sm text-center leading-relaxed">
          <ClientOnly fallback="-">
            {m.footer_copyright({
              year: currentYear.toString(),
              author: siteConfig.author,
            })}
          </ClientOnly>{" "}
          /{" "}
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium text-(--fuwari-primary) hover:text-(--fuwari-primary-hover) transition-colors"
          >
            RSS
          </a>{" "}
          /{" "}
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium text-(--fuwari-primary) hover:text-(--fuwari-primary-hover) transition-colors"
          >
            Sitemap
          </a>
          <br />
          <span className="inline-flex items-center gap-1.5 mt-2">
            {m.footer_powered_by()}{" "}
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noreferrer"
              className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium text-(--fuwari-primary) hover:text-(--fuwari-primary-hover) transition-colors"
            >
              Tanstack Start
            </a>{" "}
            &{" "}
            <a
              href="https://github.com/du2333/flare-stack-blog"
              target="_blank"
              rel="noreferrer"
              className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium text-(--fuwari-primary) hover:text-(--fuwari-primary-hover) transition-colors"
            >
              Flare Stack Blog
            </a>
          </span>
          <div className="mt-3 flex items-center justify-center gap-1 fuwari-text-30">
            <span>Made with</span>
            <Heart
              size={14}
              className="text-red-400 fill-red-400 animate-pulse"
              strokeWidth={2}
            />
          </div>
        </div>
      </div>
    </>
  );
}
