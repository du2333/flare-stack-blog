import { ExternalLink, Globe } from "lucide-react";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { cn } from "@/lib/utils";

interface FriendCardProps {
  link: Omit<FriendLinkWithUser, "createdAt" | "updatedAt">;
  className?: string;
  style?: React.CSSProperties;
}

export function FriendCard({ link, className, style }: FriendCardProps) {
  const avatarUrl = link.logoUrl || link.user?.image;
  const description = link.description || "一个未知的神秘网站";

  return (
    <a
      href={link.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fuwari-card-base block relative p-4 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg group active:scale-[0.98]",
        className,
      )}
      style={style}
    >
      <div className="flex items-center gap-4">
        {/* Avatar Area */}
        <div className="shrink-0 relative w-16 h-16 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={link.siteName}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="lazy"
              onError={(e) => {
                // Fallback icon on image load failure by hiding image and showing the background icon conceptually
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
