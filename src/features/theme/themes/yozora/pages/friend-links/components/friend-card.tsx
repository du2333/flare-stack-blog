import { Globe } from "lucide-react";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { plateOf } from "@/features/theme/themes/yozora/components/plate";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface FriendCardProps {
  link: Omit<FriendLinkWithUser, "createdAt" | "updatedAt">;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 友链书签卡：纸面 + 由站点 URL 确定性推导的专属底纹（Plate）。
 * 每张卡的色相/图案都不同，但都来自同一色池，所以整页仍统一。
 */
export function FriendCard({ link, className, style }: FriendCardProps) {
  const avatarUrl = link.logoUrl || link.user?.image;
  const description = link.description || m.friend_links_unknown_site();
  const spec = plateOf(link.siteUrl);

  return (
    <a
      href={link.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("yz-friend", className)}
      style={{
        ...style,
        ["--pa-ink" as string]: spec.ink,
        ["--pa-x" as string]: `${spec.x}%`,
      }}
    >
      {/* 专属底纹：极淡的色晕 + 日语词 */}
      <span className="yz-friend__plate" aria-hidden="true">
        <span className="yz-friend__plate-wash" />
        <span className="yz-friend__plate-word">{spec.word}</span>
      </span>

      <span className="yz-friend__logo">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={link.siteName}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Globe className="w-6 h-6 opacity-40" />
        )}
      </span>

      <span className="yz-friend__body">
        <span className="yz-friend__name">{link.siteName}</span>
        <span className="yz-friend__desc" title={description}>
          {description}
        </span>
      </span>

      <span className="yz-friend__arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}
