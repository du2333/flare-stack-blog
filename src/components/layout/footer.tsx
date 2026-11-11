import { Link, useLoaderData, useRouteContext } from "@tanstack/react-router";
import { Home } from "lucide-react";
import type { NavOption } from "@/components/layout/layout-props";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";
import { PublicNavLink } from "./public-nav-link";
import { SocialLinks } from "./social-links";

interface FooterProps {
  navOptions: Array<NavOption>;
}

/** The footer of the public pages, in the form the Theme Recipe picks. */
export function Footer({ navOptions }: FooterProps) {
  return useThemeRecipe().footer === "band" ? (
    <FooterBand navOptions={navOptions} />
  ) : (
    <FooterCaption />
  );
}

/** A centred caption under a rule: the copyright, the feed and sitemap links, the credit. */
function FooterCaption() {
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

const BRAND_MARK_SIZE = 32;

/** The mark before the title: the built-in icon unless the Site Config picks another. */
function BrandMark() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  if (siteConfig.brandMark === "none") return null;
  const image = resolveBrandMarkImage(siteConfig.brandMark, siteConfig);
  if (!image) {
    return (
      <span className="fuwari-footer-band-mark" data-mark="default">
        <Home size={16} strokeWidth={2} />
      </span>
    );
  }
  return (
    <img
      src={
        image.kind === "avatar"
          ? getPublicImageSrc(image.src, PUBLIC_IMAGE_WIDTH.avatar)
          : image.src
      }
      alt=""
      width={BRAND_MARK_SIZE}
      height={BRAND_MARK_SIZE}
      className="fuwari-footer-band-mark"
      data-mark={image.kind}
    />
  );
}

const QUIET_LINK =
  "fuwari-expand-animation -mx-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 font-medium transition-colors hover:text-(--theme-accent) pointer-coarse:-mx-2.5 pointer-coarse:min-h-11 pointer-coarse:px-2.5";

/**
 * The closing band: a surface as wide as the shell lets its footer region
 * be, with what it shows kept to the page width. The site signs off (the
 * brand mark and the title, the tagline or else the description, the social
 * links) beside every navigation entry, over one quiet line with the
 * copyright and the feed and sitemap links. It has no credit.
 */
function FooterBand({ navOptions }: FooterProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { currentYear } = useLoaderData({ from: "__root__" });
  const line = siteConfig.tagline || siteConfig.description;
  const hasSocialLinks = siteConfig.social.some((link) => link.url);

  return (
    <footer className="fuwari-footer-band">
      <div className="mx-auto w-full max-w-(--fuwari-page-width) px-6 pt-9 pb-7 md:px-8 md:pt-11">
        {/* Side by side, the navigation takes the width its entries need and
            wraps them only once the sign-off is down to 12rem. */}
        <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="min-w-0 md:max-w-md md:min-w-48 md:flex-1">
            <Link
              to="/"
              className="fuwari-heading flex min-h-8 w-fit max-w-full items-center gap-2.5 rounded-md text-lg font-bold fuwari-text-90 transition-colors hover:text-(--theme-accent) pointer-coarse:min-h-11"
            >
              <BrandMark />
              <span className="line-clamp-2 min-w-0 wrap-anywhere">
                {siteConfig.title}
              </span>
            </Link>
            {line ? (
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed wrap-anywhere fuwari-text-50">
                {line}
              </p>
            ) : null}
            {hasSocialLinks ? (
              <SocialLinks className="-mx-3 mt-2 flex flex-wrap" />
            ) : null}
          </div>
          <nav
            aria-label={m.footer_nav_label()}
            className="-mx-3 flex flex-wrap content-start gap-1 md:mx-0 md:max-w-lg md:justify-end"
          >
            {navOptions.map((option) => (
              <PublicNavLink
                key={option.id}
                option={option}
                className="inline-flex h-9 max-w-40 items-center rounded-(--theme-button-radius) px-3 text-sm font-medium fuwari-text-75 transition-colors hover:bg-(--theme-plain-bg-hover) hover:text-(--theme-accent) active:bg-(--theme-plain-bg-active) pointer-coarse:h-11"
                activeClassName="text-(--theme-accent)"
              />
            ))}
          </nav>
        </div>
        {/* The copyright at one end and the feed and sitemap links at the
            other; where one line does not hold both, the links go under it.
            Back to top never lies on the band: the shell that picks this
            form rests it above (--shell-floating-actions-position). */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-(--theme-rule,var(--fuwari-divider)) pt-5 text-sm fuwari-text-50 [border-top-style:var(--theme-rule-style)]">
          <p className="min-w-0 wrap-anywhere">
            {m.footer_copyright({
              year: currentYear.toString(),
              author: siteConfig.author,
            })}
          </p>
          <div className="flex items-center gap-5">
            <a
              href="/rss.xml"
              target="_blank"
              rel="noreferrer"
              className={QUIET_LINK}
            >
              RSS
            </a>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className={QUIET_LINK}
            >
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
