import { Link } from "@tanstack/react-router";
import type { NavOption } from "@/features/theme/contract/layouts";

interface FooterProps {
  navOptions: Array<NavOption>;
}

export function Footer({ navOptions }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="cuckoo-card mt-8">
      <div className="px-6 py-8">
        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-4 mb-6">
          {navOptions.map((option) => (
            <Link
              key={option.id}
              to={option.to}
              className="cuckoo-text-secondary hover:cuckoo-primary transition-colors text-sm"
            >
              {option.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <div className="text-center cuckoo-text-muted text-xs">
          <p>&copy; {currentYear} Blog. Powered by Flare Stack.</p>
          <p className="mt-2">
            Theme inspired by{" "}
            <a
              href="https://github.com/bhaoo/Cuckoo"
              target="_blank"
              rel="noopener noreferrer"
              className="cuckoo-primary hover:underline"
            >
              Cuckoo
            </a>
            , ported by{" "}
            <a
              href="https://github.com/SkyDream01"
              target="_blank"
              rel="noopener noreferrer"
              className="cuckoo-primary hover:underline"
            >
              Tensin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
