import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendLinkCard } from "./friend-link-card";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      {/* Header */}
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.friend_links_title()}
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          {m.friend_links_desc()}
        </p>
      </header>

      {/* Links List */}
      <div className="min-h-50">
        {links.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-lg text-muted-foreground/50">
              {m.friend_links_no_links()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/30 font-mono">
              {m.friend_links_first_link()}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <FriendLinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </div>

      {/* Submit CTA */}
      <div className="mt-20 pt-10 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">
            {m.friend_links_join_title()}
          </h3>
          <p className="text-sm text-muted-foreground font-light">
            {m.friend_links_join_desc()}
          </p>
        </div>

        <Link
          to="/submit-friend-link"
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
        >
          <span>{m.friend_links_apply()}</span>
          <ArrowUpRight
            size={14}
            className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>
    </div>
  );
}
