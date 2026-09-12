import { ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { m } from "@/paraglide/messages";

export function FriendCard({
  link,
}: {
  link: Omit<FriendLinkWithUser, "createdAt" | "updatedAt">;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const avatarUrl = [link.logoUrl, link.user?.image].find(
    (src): src is string => !!src && !failedSources.includes(src),
  );
  const description = link.description || m.friend_links_unknown_site();
  return (
    <a
      href={link.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="friend-entry"
    >
      <span className="friend-avatar">
        {avatarUrl ? (
          <img
            key={avatarUrl}
            src={avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() =>
              setFailedSources((sources) => [...sources, avatarUrl])
            }
          />
        ) : (
          <Globe size={28} strokeWidth={1.5} aria-hidden="true" />
        )}
      </span>
      <span className="friend-copy">
        <span className="friend-name">
          <span>{link.siteName}</span>
          <ExternalLink size={14} aria-hidden="true" />
        </span>
        <span className="friend-description" title={description}>
          {description}
        </span>
      </span>
    </a>
  );
}
