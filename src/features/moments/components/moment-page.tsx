import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CommentSection } from "@/features/comments/components/comment-section";
import { MomentCard } from "@/features/moments/components/moment-card";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { m } from "@/paraglide/messages";

/**
 * One Moment on a page of its own, with the way back to the timeline and its
 * comment section (the same one a Post has). Like
 * the other public pages it opens on a card, not a title over the banner.
 */
export function MomentPage({ moment }: { moment: PublicMoment }) {
  return (
    <div
      className="fuwari-onload-animation flex flex-col gap-4"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <h1 className="sr-only">{m.moments_title()}</h1>
      <Link
        to="/moments"
        className="fuwari-card-base inline-flex w-fit items-center gap-1.5 px-4 py-2 text-sm font-medium fuwari-text-75 transition hover:text-(--fuwari-primary)"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {m.moments_all()}
      </Link>
      <MomentCard moment={moment} />
      <div className="fuwari-card-base p-6">
        <CommentSection target={{ type: "moment", id: moment.id }} />
      </div>
    </div>
  );
}
