import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";

/**
 * Enhanced Friend Links Page — Amazing Theme
 *
 * Features:
 * - Header with gradient background and sparkle icon
 * - Apply button with glow pulse
 * - Grid cards with staggered scale-bounce entrance
 * - Alternating entrance directions
 */
export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Banner */}
      <div
        className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-56 fuwari-onload-animation"
        style={{
          animationDelay: "150ms",
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
          background: `linear-gradient(135deg, rgba(var(--amazing-primary-rgb), 0.06), rgba(var(--amazing-accent-rgb), 0.04), transparent)`,
        }}
      >
        {/* Decorative floating sparkles */}
        <Sparkles
          className="absolute top-6 right-8 text-(--fuwari-primary) opacity-15 w-16 h-16"
          style={{ animation: "amazing-float 4s ease-in-out infinite" }}
        />
        <Sparkles
          className="absolute bottom-8 left-10 text-(--fuwari-primary) opacity-10 w-10 h-10"
          style={{
            animation: "amazing-float 5s ease-in-out infinite",
            animationDelay: "-2s",
          }}
        />

        <h1 className="text-3xl md:text-4xl font-bold fuwari-text-90 mb-4 z-10 transition-colors">
          {m.friend_links_title()}
        </h1>
        <p className="fuwari-text-50 text-center max-w-xl z-10 transition-colors">
          {m.friend_links_fuwari_desc()}
        </p>
        <Link
          to="/submit-friend-link"
          className="mt-6 z-10 fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all hover:shadow-[0_4px_24px_rgba(var(--amazing-primary-rgb),0.3)] hover:scale-105"
        >
          <Sparkles size={16} />
          {m.friend_links_fuwari_apply()}
        </Link>
      </div>

      {/* Links Grid */}
      <div
        className="fuwari-card-base p-6 md:p-8 fuwari-onload-animation flex-1"
        style={{
          animationDelay: "300ms",
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {links.map((link, i) => (
              <FriendCard
                key={link.id}
                link={link}
                className="amazing-animate-in"
                style={{
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 fuwari-text-30 transition-colors">
            <p className="text-lg">{m.friend_links_fuwari_no_links()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
