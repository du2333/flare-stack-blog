import { useLoaderData, useRouteContext } from "@tanstack/react-router";
import { Network, Rss } from "lucide-react";
import { m } from "@/paraglide/messages";
import type { FooterFormProps } from "./footer-form";

const LINK =
  "fuwari-expand-animation -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:text-(--theme-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-accent) pointer-coarse:-mx-2.5 pointer-coarse:min-h-11 pointer-coarse:px-2.5";

/**
 * The footer as a colophon (Theme Recipe, footer: "colophon"): one quiet
 * line under a rule, as wide as the footer region of the Theme Shell. The
 * feed and sitemap links stand at one end, each by name after its icon, and
 * the copyright in small at the other; where one line does not hold both,
 * the copyright goes under the links, flush with the start.
 *
 * It names nobody and has no navigation, no social links and no credit: a
 * Theme picks it when its frame already shows who writes here on every page,
 * as the rail of 「侧栏」 does. The navigation entries it is given are not
 * shown.
 */
export function FooterColophon(_props: FooterFormProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { currentYear } = useLoaderData({ from: "__root__" });

  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 border-t border-(--theme-rule,var(--fuwari-divider)) pt-4 pb-6 [border-top-style:var(--theme-rule-style)] md:px-2">
      <div className="flex items-center gap-6 text-sm fuwari-text-75">
        <a href="/rss.xml" target="_blank" rel="noreferrer" className={LINK}>
          <Rss size={14} strokeWidth={2} aria-hidden="true" />
          RSS
        </a>
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noreferrer"
          className={LINK}
        >
          <Network size={14} strokeWidth={2} aria-hidden="true" />
          Sitemap
        </a>
      </div>
      <p className="min-w-0 text-xs leading-relaxed wrap-anywhere fuwari-text-50">
        {m.footer_copyright({
          year: currentYear.toString(),
          author: siteConfig.author,
        })}
      </p>
    </footer>
  );
}
