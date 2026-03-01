import { useState, useEffect } from "react";
import { Sidebar } from "../components/sidebar";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { MobileMenu } from "./mobile-menu";
import { BackgroundLayer } from "../components/background-layer";
import { blogConfig } from "@/blog.config";
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (c: number) => Math.max(0, Math.min(255, c + amount));
  return `#${adjust(rgb.r).toString(16).padStart(2, "0")}${adjust(rgb.g).toString(16).padStart(2, "0")}${adjust(rgb.b).toString(16).padStart(2, "0")}`;
}

function ThemeColorInitializer() {
  useEffect(() => {
    const primaryColor = blogConfig.theme.cuckoo.primaryColor;
    const root = document.documentElement;
    const isDark = document.documentElement.classList.contains("dark");
    const baseColor = isDark ? adjustBrightness(primaryColor, 10) : primaryColor;
    const hoverColor = adjustBrightness(baseColor, -15);
    const activeColor = adjustBrightness(baseColor, -30);
    root.style.setProperty("--cuckoo-primary", baseColor);
    root.style.setProperty("--cuckoo-primary-hover", hoverColor);
    root.style.setProperty("--cuckoo-primary-active", activeColor);
    const rgb = hexToRgb(baseColor);
    if (rgb) root.style.setProperty("--cuckoo-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }, []);
  return null;
}

export function PublicLayout({ children, navOptions, user, logout }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <>
      <ThemeColorInitializer />
      <div className="min-h-screen bg-[var(--cuckoo-page-bg)] transition-colors">
        <BackgroundLayer />
        <MobileMenu navOptions={navOptions} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} logout={logout} />
        <div className="relative">
          <div className="sticky top-0 z-40">
            <div className="max-w-[var(--cuckoo-max-width)] mx-auto px-4">
              <Navbar onMenuClick={() => setIsMenuOpen(true)} user={user} />
            </div>
          </div>
          <div className="max-w-[var(--cuckoo-max-width)] mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <aside className="hidden lg:block">
                <div className="sticky top-[80px]">
                  <Sidebar />
                </div>
              </aside>
              <main className="min-h-[calc(100vh-200px)]">{children}</main>
            </div>
            <div className="hidden lg:block">
              <Footer navOptions={navOptions} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
