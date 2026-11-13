import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { AnchorHTMLAttributes } from "react";
import type { NavLinkOption } from "@/components/layout/layout-props";

const STATIC_HREF = {
  "/": "/",
  "/posts": "/posts",
  "/moments": "/moments",
  "/friend-links": "/friend-links",
} as const;

function postSlugFromHref(href: string): string | null {
  const [path] = href.split(/[?#]/);
  const match = /^\/post\/([^/]+)\/?$/.exec(path ?? "");
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * A navigation link: the router's for a page of this site, a plain one that
 * opens in a new tab for another site. `role`, `tabIndex` and `aria-current`
 * go to the link, for a row of a menu (`MenuLinkItem`).
 */
export function PublicNavLink({
  option,
  className,
  activeClassName,
  onClick,
  ...linkProps
}: {
  option: NavLinkOption;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
} & Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "role" | "tabIndex" | "aria-current"
>) {
  const label = (
    <>
      <span className="truncate">{option.label}</span>
      {option.external ? (
        <ExternalLink
          size={14}
          strokeWidth={1.75}
          className="ml-1 shrink-0 opacity-70"
        />
      ) : null}
    </>
  );

  if (option.external) {
    return (
      <a
        {...linkProps}
        href={option.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  const slug = postSlugFromHref(option.href);
  if (slug) {
    return (
      <Link
        {...linkProps}
        to="/post/$slug"
        params={{ slug }}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  const staticTo = STATIC_HREF[option.href as keyof typeof STATIC_HREF];
  if (staticTo) {
    return (
      <Link
        {...linkProps}
        to={staticTo}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  return (
    <a
      {...linkProps}
      href={option.href}
      className={className}
      onClick={onClick}
    >
      {label}
    </a>
  );
}
