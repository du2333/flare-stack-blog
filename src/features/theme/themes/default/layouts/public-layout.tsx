import { useState } from "react";
import { Footer } from "./footer";
import { MobileMenu } from "./mobile-menu";
import { Navbar } from "./navbar";
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="default-theme min-h-screen flex flex-col">
      <Navbar
        navOptions={navOptions}
        onMenuClick={() => setIsMenuOpen(true)}
        user={user}
        isLoading={isSessionLoading}
      />
      <MobileMenu
        navOptions={navOptions}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        logout={logout}
      />
      <main className="flex-1">{children}</main>
      <Footer navOptions={navOptions} />
    </div>
  );
}
