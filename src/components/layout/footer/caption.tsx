import { useLoaderData, useRouteContext } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

/**
 * The footer as a caption (Theme Recipe, footer: "caption"): centred under a
 * rule, the copyright, the feed and sitemap links, the credit.
 */
export function FooterCaption() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { currentYear } = useLoaderData({ from: "__root__" });

  return (
    <>
      <div className="border-t border-(--theme-rule,var(--fuwari-divider)) my-10 [border-top-style:var(--theme-rule-style)] mx-4 md:mx-32" />
      <div className="border-dashed border-(--theme-rule,var(--fuwari-divider)) rounded-2xl mb-12 flex flex-col items-center justify-center px-6 py-8">
        <div className="fuwari-text-50 text-sm text-center">
          {m.footer_copyright({
            year: currentYear.toString(),
            author: siteConfig.author,
          })}{" "}
          /{" "}
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--theme-accent) text-(--theme-accent)"
          >
            RSS
          </a>{" "}
          /{" "}
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--theme-accent) text-(--theme-accent)"
          >
            Sitemap
          </a>
          <br />
          {m.footer_powered_by()}{" "}
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--theme-accent) text-(--theme-accent)"
          >
            Tanstack Start
          </a>{" "}
          &{" "}
          <a
            href="https://github.com/du2333/flare-stack-blog"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--theme-accent) text-(--theme-accent)"
          >
            Flare Stack Blog
          </a>
        </div>
      </div>
    </>
  );
}
