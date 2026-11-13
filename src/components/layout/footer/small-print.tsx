import { useLoaderData, useRouteContext } from "@tanstack/react-router";
import { Network, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const LINK =
  "fuwari-expand-animation -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:text-(--theme-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-accent) pointer-coarse:-mx-2.5 pointer-coarse:min-h-11 pointer-coarse:px-2.5";

/**
 * The small print two forms of the footer end in, the signature and the
 * colophon (signature.tsx, colophon.tsx): the feed and sitemap links, and
 * the copyright. Each form places the two itself and may add to their
 * classes; what they say and how they look is the same in both.
 */

/** The feed and sitemap links on one line, each by name after its icon. */
export function FeedLinks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 text-sm fuwari-text-75",
        className,
      )}
    >
      <a href="/rss.xml" target="_blank" rel="noreferrer" className={LINK}>
        <Rss size={14} strokeWidth={2} aria-hidden="true" />
        RSS
      </a>
      <a href="/sitemap.xml" target="_blank" rel="noreferrer" className={LINK}>
        <Network size={14} strokeWidth={2} aria-hidden="true" />
        Sitemap
      </a>
    </div>
  );
}

/** The copyright in small: the year and the author's name. */
export function Copyright({ className }: { className?: string }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { currentYear } = useLoaderData({ from: "__root__" });
  return (
    <p
      className={cn(
        "text-xs leading-relaxed wrap-anywhere fuwari-text-50",
        className,
      )}
    >
      {m.footer_copyright({
        year: currentYear.toString(),
        author: siteConfig.author,
      })}
    </p>
  );
}
