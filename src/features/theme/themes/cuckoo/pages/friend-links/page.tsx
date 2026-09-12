import { Link } from "@tanstack/react-router";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="cuckoo-onload-animation mt-5">
      {/* 页头 */}
      <div className="cuckoo-card-base cuckoo-card-hoverable mb-5 p-6 text-center">
        <h1 className="cuckoo-highlight-title">{m.friend_links_title()}</h1>
        <p className="cuckoo-text-50 mt-3 text-sm leading-relaxed">
          {m.friend_links_cuckoo_desc()}
        </p>
      </div>

      {links.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {links.map((link, i) => (
            <div
              key={link.id}
              className="cuckoo-onload-animation"
              style={{ animationDelay: `calc(100ms + ${i * 50}ms)` }}
            >
              <FriendCard link={link} />
            </div>
          ))}
        </div>
      ) : (
        <div className="cuckoo-card-base cuckoo-text-50 p-10 text-center text-sm">
          {m.friend_links_cuckoo_no_links()}
        </div>
      )}

      {/* 申请入口 */}
      <div className="mt-5 text-center">
        <Link
          to="/submit-friend-link"
          className="cuckoo-btn-primary h-10 px-8 text-sm font-medium active:scale-95"
        >
          {m.friend_links_apply()}
        </Link>
      </div>
    </div>
  );
}
