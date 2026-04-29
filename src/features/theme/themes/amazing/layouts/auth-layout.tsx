import { ArrowLeft } from "lucide-react";
import type { AuthLayoutProps } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

/**
 * Aurora Background Auth Layout — Amazing Theme
 *
 * Features:
 * - Multi-layer aurora gradient background with slow animation
 * - Floating card with gentle up-down animation
 * - Input focus glow effect
 * - Glassmorphism card
 */
export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen text-(--fuwari-text-75) flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora background layers */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-(--fuwari-page-bg)">
        {/* Aurora blob 1 — top-left */}
        <div
          className="absolute w-[60vw] h-[60vh] rounded-full opacity-[0.07] blur-[100px]"
          style={{
            top: "-15%",
            left: "-15%",
            background:
              "radial-gradient(ellipse, rgb(var(--amazing-primary-rgb)), transparent 70%)",
            animation: "amazing-drift 20s ease-in-out infinite",
          }}
        />
        {/* Aurora blob 2 — bottom-right */}
        <div
          className="absolute w-[50vw] h-[50vh] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            bottom: "-10%",
            right: "-10%",
            background:
              "radial-gradient(ellipse, rgb(var(--amazing-accent-rgb)), transparent 70%)",
            animation: "amazing-drift 25s ease-in-out infinite reverse",
          }}
        />
        {/* Aurora blob 3 — center */}
        <div
          className="absolute w-[40vw] h-[40vh] rounded-full opacity-[0.04] blur-[80px]"
          style={{
            top: "30%",
            left: "40%",
            background:
              "radial-gradient(ellipse, rgb(var(--amazing-primary-rgb)), rgb(var(--amazing-accent-rgb)), transparent 70%)",
            animation: "amazing-drift 30s ease-in-out infinite",
            animationDelay: "-10s",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 fuwari-onload-animation">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group absolute -top-14 left-0 flex items-center justify-center w-10 h-10 rounded-xl amazing-navbar-glass shadow-lg text-(--fuwari-text-50) hover:text-(--fuwari-text-90) hover:shadow-xl transition-all hover:scale-110 active:scale-95 shrink-0"
          title={m.auth_layout_back_home()}
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform duration-300"
          />
        </button>

        {/* Auth Card Container with glass morphism */}
        <div
          className="fuwari-card-base p-8 md:p-10 w-full shadow-2xl shadow-black/5 dark:shadow-black/20 ring-1 ring-white/10"
          style={{
            animation: "amazing-float 6s ease-in-out infinite",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
