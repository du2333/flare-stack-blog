import { Link } from "@tanstack/react-router";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Banner representing the current page */}
      <div
        className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-56 fuwari-onload-animation bg-linear-to-br from-(--fuwari-primary)/5 to-transparent"
        style={{ animationDelay: "150ms" }}
      >
        <h1 className="text-3xl md:text-4xl font-bold fuwari-text-90 mb-4 z-10 transition-colors">
          {m.friend_links_title()}
        </h1>
        <p className="fuwari-text-50 text-center max-w-xl z-10 transition-colors">
          {m.friend_links_fuwari_desc()}
        </p>
        <Link
          to="/submit-friend-link"
          className="mt-6 z-10 fuwari-onload-animation fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all"
        >
          {m.friend_links_fuwari_apply()}
        </Link>
      </div>

      {/* Links Grid */}
      <div
        className="fuwari-card-base p-6 md:p-8 fuwari-onload-animation flex-1"
        style={{ animationDelay: "300ms" }}
      >
        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {links.map((link, i) => (
              <FriendCard
                key={link.id}
                link={link}
                className="fuwari-onload-animation"
                style={{ animationDelay: `${400 + i * 50}ms` }}
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
