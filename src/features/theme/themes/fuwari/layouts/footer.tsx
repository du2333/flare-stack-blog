import { useRouteContext } from "@tanstack/react-router";
import type { NavOption } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

interface FooterProps {
  navOptions: Array<NavOption>;
}

export function Footer(_: FooterProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="border-t border-black/10 dark:border-white/15 my-10 border-dashed mx-4 md:mx-32" />
      <div className="border-dashed border-black/10 dark:border-white/15 rounded-2xl mb-12 flex flex-col items-center justify-center px-6 py-8">
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
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary)"
          >
            RSS
          </a>{" "}
          /{" "}
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary)"
          >
            Sitemap
          </a>
          <br />
          {m.footer_powered_by()}{" "}
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary)"
          >
            Tanstack Start
          </a>{" "}
          &{" "}
          <a
            href="https://github.com/du2333/flare-stack-blog"
            target="_blank"
            rel="noreferrer"
            className="fuwari-expand-animation rounded-md px-1 -m-1 font-medium hover:text-(--fuwari-primary) text-(--fuwari-primary)"
          >
            Flare Stack Blog
          </a>
        </div>
      </div>
    </>
  );
}
