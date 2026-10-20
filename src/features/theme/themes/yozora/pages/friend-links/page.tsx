import { Link } from "@tanstack/react-router";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { Plate } from "@/features/theme/themes/yozora/components/plate";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="fuwari-card-base relative px-6 md:px-9 py-8 w-full yz-post fuwari-onload-animation">
      <Plate slug="friend-links" />

      <div className="relative z-10">
        {/* 书脊页头：与目录页同语言 */}
        <header className="yz-book__head">
          <div className="yz-hero__pagemark">
            <svg width="34" height="10" viewBox="0 0 34 10" fill="none" aria-hidden="true">
              <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
              <path
                d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
                stroke="var(--yz-gold)"
                strokeWidth=".8"
                fill="none"
              />
            </svg>
            <span>Friends · 友の章</span>
          </div>
          <h1 className="yz-book__title">{m.friend_links_title()}</h1>
          <p className="yz-book__desc">{m.friend_links_fuwari_desc()}</p>
          <Link to="/submit-friend-link" className="yz-hero__solid mt-6 inline-block">
            {m.friend_links_fuwari_apply()}
          </Link>
        </header>

        {/* 书签网格 */}
        <div className="yz-friends mt-8">
          {links.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {links.map((link, i) => (
                <FriendCard
                  key={link.id}
                  link={link}
                  className="fuwari-onload-animation"
                  style={{ animationDelay: `${160 + i * 45}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 fuwari-text-30 transition-colors">
              <p className="text-lg">{m.friend_links_fuwari_no_links()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
