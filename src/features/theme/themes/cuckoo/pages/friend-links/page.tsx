import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="cuckoo-card p-6 md:p-8 cuckoo-fade-in text-center">
        <h1 className="text-2xl md:text-3xl font-bold cuckoo-text-primary mb-3">
          友情链接
        </h1>
        <p className="cuckoo-text-secondary mb-6">海内存知己，天涯若比邻</p>
        <Link
          to="/submit-friend-link"
          className="cuckoo-btn cuckoo-btn-primary px-6 py-2.5"
        >
          申请友链
        </Link>
      </div>

      {/* Links Grid */}
      <div className="cuckoo-card p-6 md:p-8 cuckoo-slide-up">
        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {links.map((link, i) => (
              <a
                key={link.id}
                href={link.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 rounded-lg border border-[var(--cuckoo-border)] hover:border-[var(--cuckoo-primary)] hover:shadow-lg transition-all duration-300 cuckoo-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {link.logoUrl ? (
                    <img
                      src={link.logoUrl}
                      alt={link.siteName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[var(--cuckoo-border)] group-hover:border-[var(--cuckoo-primary)] transition-colors"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--cuckoo-card-bg-hover)] flex items-center justify-center border-2 border-[var(--cuckoo-border)]">
                      <span className="text-lg font-bold cuckoo-text-secondary">
                        {link.siteName[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold cuckoo-text-primary group-hover:cuckoo-primary transition-colors truncate">
                      {link.siteName}
                    </h3>
                    <p className="text-xs cuckoo-text-muted truncate">
                      {link.description?.slice(0, 20) || link.siteUrl}
                    </p>
                  </div>
                  <ExternalLink
                    size={16}
                    className="cuckoo-text-muted group-hover:cuckoo-primary transition-colors"
                  />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="cuckoo-text-muted">暂无友情链接记录 🍃</p>
          </div>
        )}
      </div>
    </div>
  );
}
