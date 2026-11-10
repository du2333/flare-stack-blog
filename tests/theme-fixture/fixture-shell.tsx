import { Link, useRouteContext } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useCallback, useState } from "react";
import { ColourSchemeToggle } from "@/components/common/colour-scheme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { Button } from "@/components/ui/button";
import {
  focalObjectPosition,
  isFocalPointCentred,
} from "@/components/ui/focal-point";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type { ThemeShell, ThemeShellProps } from "@/features/theme/theme-shell";
import { m } from "@/paraglide/messages";
import { FIXTURE_THEME_ID } from "./theme-id";

/** The mark before the title, as Site Config picks it. */
function BrandMark() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  if (siteConfig.brandMark === "none") return null;
  const image = resolveBrandMarkImage(siteConfig.brandMark, siteConfig);
  if (!image) return <Home size={24} />;
  return (
    <img
      src={
        image.kind === "avatar"
          ? getPublicImageSrc(image.src, PUBLIC_IMAGE_WIDTH.avatar)
          : image.src
      }
      alt=""
      width={24}
      height={24}
    />
  );
}

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
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [menu, setMenu] = useState<"compact" | "account" | null>(null);
  const toggle = (next: "compact" | "account") =>
    setMenu((open) => (open === next ? null : next));
  // The 12rem banner and the 6rem header are the first screen.
  const firstScreenHeight = useCallback(() => 288, []);

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="fixture-shell"
        data-theme-shell={FIXTURE_THEME_ID}
        data-marker={options.marker === true ? "on" : "off"}
      >
        <img
          className="fixture-banner"
          src={getPublicImageSrc(
            siteConfig.bannerImage,
            PUBLIC_IMAGE_WIDTH.banner,
          )}
          alt="banner"
          style={
            isFocalPointCentred(siteConfig.bannerFocus)
              ? undefined
              : { objectPosition: focalObjectPosition(siteConfig.bannerFocus) }
          }
        />
        <header className="fixture-header">
          <Link to="/" className="fixture-brand">
            <BrandMark />
            {siteConfig.title}
          </Link>
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
        {pageKind !== "focused" && siteConfig.tagline ? (
          <p className="fixture-tagline">{siteConfig.tagline}</p>
        ) : null}
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
  // Unlike 「经典」, on inner pages too, so the shared tests see both answers.
  taglineOn: ["home", "inner"],
};
