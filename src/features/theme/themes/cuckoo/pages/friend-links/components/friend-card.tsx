import { User as UserIcon } from "lucide-react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";

type FriendLink = FriendLinksPageProps["links"][number];

/**
 * 友链卡片(对应原主题 .links-card):
 * 圆形 Logo 半悬浮于卡片上缘,右侧站名与描述。
 */
export function FriendCard({ link }: { link: FriendLink }) {
  const logo = link.logoUrl || link.user?.image;

  return (
    <a
      href={link.siteUrl}
      target="_blank"
      rel="noreferrer"
      className="cuckoo-card-base cuckoo-card-hoverable group relative block h-27 pt-11 pr-4 pb-4 pl-29"
      style={{ height: "115px" }}
    >
      {/* 悬浮圆形 Logo(对应原主题 .links-img img) */}
      <div className="absolute top-4 left-7 h-21 w-21 overflow-hidden rounded-full shadow-md transition-transform duration-300 group-hover:scale-110">
        {logo ? (
          <img
            src={logo}
            alt={link.siteName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="cuckoo-text-50 flex h-full w-full items-center justify-center bg-(--cuckoo-btn-regular-bg)">
            <UserIcon size={26} strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="cuckoo-text-90 group-hover:text-(--cuckoo-accent) truncate text-lg font-medium transition-colors">
          {link.siteName}
        </div>
        <div className="cuckoo-text-50 links-text mt-1.5 text-sm leading-snug">
          {link.description ?? ""}
        </div>
      </div>
    </a>
  );
}
