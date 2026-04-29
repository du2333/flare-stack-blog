import { ExternalLink, Globe } from "lucide-react";
import { useCallback, useRef } from "react";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface FriendCardProps {
  link: Omit<FriendLinkWithUser, "createdAt" | "updatedAt">;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Enhanced Friend Card — Amazing Theme
 *
 * Features:
 * - 3D perspective tilt on hover (±10°)
 * - Radial gradient highlight following mouse
 * - Scale-up avatar on hover
 * - External link icon slide-in
 */
export function FriendCard({ link, className, style }: FriendCardProps) {
  const avatarUrl = link.logoUrl || link.user?.image;
  const description = link.description || m.friend_links_unknown_site();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateX = (y - 0.5) * -20; // ±10°
    const rotateY = (x - 0.5) * 20;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    card.style.setProperty("--highlight-x", `${x * 100}%`);
    card.style.setProperty("--highlight-y", `${y * 100}%`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateX(0) rotateY(0) translateZ(0)";
  }, []);

  return (
    <a
      ref={cardRef}
      href={link.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fuwari-card-base amazing-3d-card block relative p-4 transition-all duration-300",
        "hover:shadow-xl group active:scale-[0.98]",
        className,
      )}
      style={{
        ...style,
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar Area */}
        <div className="shrink-0 relative w-16 h-16 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={link.siteName}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement?.classList.add(
                  "!bg-(--fuwari-btn-regular-bg)",
                );
              }}
            />
          ) : (
            <Globe className="w-8 h-8 opacity-40" />
          )}
        </div>

        {/* Content Area */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold fuwari-text-90 truncate transition-colors duration-300 group-hover:text-(--fuwari-primary) flex items-center gap-1.5">
            {link.siteName}
            <ExternalLink className="w-4 h-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-(--fuwari-primary)" />
          </h3>
          <p
            className="text-sm fuwari-text-50 mt-1 line-clamp-2 leading-relaxed"
            title={description}
          >
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}
