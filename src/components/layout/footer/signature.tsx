import { Link, useRouteContext } from "@tanstack/react-router";
import type { FooterFormProps } from "./footer-form";
import { Copyright, FeedLinks } from "./small-print";
import "./signature.css";

/**
 * The footer as a signature (Theme Recipe, footer: "signature"): the
 * sign-off of a printed page, flat under a rule and as wide as the shell
 * lets its footer region be. At one end the author's name in the heading
 * face, on a short stroke of the accent, over the tagline or else the
 * description; at the other the feed and sitemap links over the copyright in
 * small. It lists no navigation and has no brand mark, no social links and
 * no credit: a Theme picks it when its first screen and the profile card
 * already say who writes here. On a narrow screen the two ends stack.
 */
export function FooterSignature(_props: FooterFormProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const line = siteConfig.tagline || siteConfig.description;

  return (
    <footer className="fuwari-footer-signature flex flex-col gap-x-10 gap-y-5 border-t border-(--theme-rule,var(--fuwari-divider)) pt-7 pb-9 [border-top-style:var(--theme-rule-style)] sm:flex-row sm:justify-between">
      <div className="min-w-0 sm:max-w-md">
        <Link
          to="/"
          className="fuwari-heading fuwari-footer-signature-name w-fit max-w-full rounded-md text-2xl leading-8 font-bold wrap-anywhere fuwari-text-90 transition-colors hover:text-(--theme-accent)"
        >
          {siteConfig.author}
        </Link>
        {line ? (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed wrap-anywhere fuwari-text-50">
            {line}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-y-2.5 sm:items-end">
        {/* As tall as the name, so the two ends share their first line. */}
        <FeedLinks className="sm:h-8" />
        <Copyright className="sm:text-right" />
      </div>
    </footer>
  );
}
