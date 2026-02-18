import { Link } from "@tanstack/react-router";
import type { NavOption } from "@/features/theme/contract/layouts";
import { blogConfig } from "@/blog.config";

interface FooterProps {
  navOptions: Array<NavOption>;
}

export function Footer({ navOptions }: FooterProps) {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-16 mt-32">
      <div className="max-w-3xl mx-auto px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Brand / Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-serif text-lg font-bold tracking-tighter text-foreground">
            [ {blogConfig.name} ]
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            © {new Date().getFullYear()} {blogConfig.author}.
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
            href={blogConfig.social.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Github
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            className="hover:text-foreground transition-colors"
          >
            Email
          </a>
        </nav>
      </div>
    </footer>
  );
}
