import { Link } from "@tanstack/react-router";
import { buttonClass } from "@/components/ui/button";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { EmptyState } from "@/components/ui/empty-state";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./friend-card";
import "./friend-links-page.css";

interface FriendLinksPageProps {
  links: Array<Omit<FriendLinkWithUser, "createdAt" | "updatedAt">>;
}

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  const { headingAccent } = useThemeRecipe();
  return (
    <section className="friends-page fuwari-card-base fuwari-card-panel fuwari-content-enter">
      <header
        className="friends-heading"
        data-accent={headingAccent === "off" ? "off" : undefined}
      >
        <h1>{m.friend_links_title()}</h1>
        <Link
          to="/submit-friend-link"
          className={buttonClass({ size: "lg", className: "friends-apply" })}
        >
          {m.friend_links_fuwari_apply()}
        </Link>
        <p>{m.friend_links_fuwari_desc()}</p>
      </header>
      {links.length ? (
        <ul className="friends-grid">
          {links.map((link) => (
            <li key={link.id}>
              <FriendCard link={link} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState description={m.friend_links_fuwari_no_links()} />
      )}
    </section>
  );
}
