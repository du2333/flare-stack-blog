import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import {
  MomentAdminActions,
  MomentEditor,
} from "@/features/moments/components/admin";
import { MomentCommentLink } from "@/features/moments/components/moment-comment-link";
import { MomentAvatar } from "@/features/moments/components/moment-avatar";
import { MomentImages } from "@/features/moments/components/moment-images";
import { MomentShareButton } from "@/features/moments/components/moment-share-button";
import { MomentText } from "@/features/moments/components/moment-text";
import { MomentTime } from "@/features/moments/components/moment-time";
import { MomentVideo } from "@/features/moments/components/moment-video";
import { useIsAdmin } from "@/features/moments/hooks/use-is-admin";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";

/**
 * One Moment as a card: who posted it and when, the text, then the images or
 * the video, then its comment count and share button. The Admin's edit and delete actions sit
 * in the header; editing turns the card into the composer, in place.
 */
export function MomentCard({ moment }: { moment: PublicMoment }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const isAdmin = useIsAdmin();
  const [editing, setEditing] = useState(false);

  if (isAdmin && editing) {
    return <MomentEditor moment={moment} onDone={() => setEditing(false)} />;
  }

  return (
    <article className="fuwari-card-base flex flex-col gap-3 p-5 md:p-6">
      <header className="flex items-center gap-3">
        <MomentAvatar />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold fuwari-text-90">
            {siteConfig.author}
          </span>
          <MomentTime
            moment={moment}
            className="text-sm font-medium fuwari-text-50"
          />
        </div>
        {isAdmin ? (
          <MomentAdminActions moment={moment} onEdit={() => setEditing(true)} />
        ) : null}
      </header>
      {moment.text ? (
        <MomentText
          text={moment.text}
          className="text-base leading-relaxed fuwari-text-90"
        />
      ) : null}
      <MomentImages momentId={moment.id} images={moment.images} />
      {moment.video ? <MomentVideo video={moment.video} /> : null}
      <footer className="-ml-2 flex items-center gap-1">
        <MomentCommentLink moment={moment} />
        <MomentShareButton moment={moment} />
      </footer>
    </article>
  );
}
