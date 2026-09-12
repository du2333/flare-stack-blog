import { Link } from "@tanstack/react-router";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./friend-card";
import "./friend-links-page.css";

interface FriendLinksPageProps {
  links: Array<Omit<FriendLinkWithUser, "createdAt" | "updatedAt">>;
}

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <section className="friends-page fuwari-card-base fuwari-content-enter">
      <header className="friends-heading">
        <h1>{m.friend_links_title()}</h1>
        <Link
          to="/submit-friend-link"
          className="friends-apply fuwari-btn-regular"
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
        <p className="friends-empty">{m.friend_links_fuwari_no_links()}</p>
      )}
    </section>
  );
}
