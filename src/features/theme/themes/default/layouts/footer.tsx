import { Link, useRouteContext } from "@tanstack/react-router";
import type { NavOption } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

interface FooterProps {
  navOptions: Array<NavOption>;
}

export function Footer({ navOptions }: FooterProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <footer className="border-t border-border/40 bg-background/50 py-16 mt-32">
      <div className="max-w-3xl mx-auto px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Brand / Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-serif text-lg font-bold tracking-tighter text-foreground">
            [ {siteConfig.theme.default.navBarName} ]
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            {m.footer_copyright({
              year: new Date().getFullYear().toString(),
              author: siteConfig.author,
            })}
          </span>
        </div>

        {/* Minimalist Links */}
        <nav className="flex items-center gap-8 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          {navOptions.map((option) => (
            <Link
              key={option.id}
              to={option.to}
              className="hover:text-foreground transition-colors"
            >
              {option.label}
            </Link>
          ))}
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Github
          </a>
          <a
            href={`mailto:${siteConfig.social.email}`}
            className="hover:text-foreground transition-colors"
          >
            Email
          </a>
        </nav>
      </div>
    </footer>
  );
}
