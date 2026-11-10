import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { Button } from "@/components/ui/button";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type { ThemeShell, ThemeShellProps } from "@/features/theme/theme-shell";
import { m } from "@/paraglide/messages";
import { FIXTURE_THEME_ID } from "./theme-id";

/**
 * The fixture Theme's shell: the least a shell must do to pass the shared
 * shell tests, laid out plainly. Not a design.
 */
function FixtureShell({
  pageKind,
  options,
  navOptions,
  sidebarCards,
  user,
  isSessionLoading,
  logout,
  children,
  footer,
  floatingActions,
}: ThemeShellProps) {
  const [menu, setMenu] = useState<"compact" | "account" | null>(null);
  const toggle = (next: "compact" | "account") =>
    setMenu((open) => (open === next ? null : next));
  // A header of 6rem is the first screen.
  const firstScreenHeight = useCallback(() => 96, []);

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="fixture-shell"
        data-theme-shell={FIXTURE_THEME_ID}
        data-marker={options.marker === true ? "on" : "off"}
      >
        <header className="fixture-header">
          <nav className="fixture-nav">
            {navOptions.map((option) => (
              <PublicNavLink key={option.id} option={option} />
            ))}
          </nav>
          <Link to="/search">{m.nav_search()}</Link>
          <ColourSchemeToggle className="fixture-tool" />
          <LanguageSwitcher className="fixture-tool" />
          <Button
            variant="regular"
            aria-expanded={menu === "compact"}
            onClick={() => toggle("compact")}
          >
            {m.common_open_menu()}
          </Button>
          <Button
            variant="regular"
            aria-expanded={menu === "account"}
            onClick={() => toggle("account")}
          >
            {user ? m.profile_title() : m.nav_login_register()}
          </Button>
          {menu && (
            <div className="fixture-menu">
              <MobileMenu
                navOptions={navOptions}
                user={user}
                isLoading={isSessionLoading}
                logout={logout}
                mobile={menu === "compact"}
                onClose={() => setMenu(null)}
              />
            </div>
          )}
        </header>
        <div className="fixture-body" data-shell-region="body">
          <main data-shell-region="main">{children}</main>
          {pageKind === "focused" ? null : (
            <aside data-shell-region="sidebar">
              {sidebarCards.map((card) => (
                <section key={card.id}>{card.content}</section>
              ))}
            </aside>
          )}
          <div data-shell-region="footer">{footer}</div>
          {floatingActions}
        </div>
      </div>
    </FirstScreenProvider>
  );
}

export const fixtureShell: ThemeShell = {
  id: FIXTURE_THEME_ID,
  Shell: FixtureShell,
  identityInFirstScreen: [],
};
