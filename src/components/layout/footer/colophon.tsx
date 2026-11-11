import type { FooterFormProps } from "./footer-form";
import { Copyright, FeedLinks } from "./small-print";

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
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 border-t border-(--theme-rule,var(--fuwari-divider)) pt-4 pb-6 [border-top-style:var(--theme-rule-style)] md:px-2">
      <FeedLinks />
      <Copyright className="min-w-0" />
    </footer>
  );
}
