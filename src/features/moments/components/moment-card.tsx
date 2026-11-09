import { useRouteContext } from "@tanstack/react-router";
import { MomentAdminActions } from "@/features/moments/components/admin";
import { MomentImages } from "@/features/moments/components/moment-images";
import { MomentText } from "@/features/moments/components/moment-text";
import { MomentTime } from "@/features/moments/components/moment-time";
import { MomentVideo } from "@/features/moments/components/moment-video";
import { useIsAdmin } from "@/features/moments/hooks/use-is-admin";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";

/**
 * One Moment as a card: who posted it and when, the text, then the images or
 * the video. The Admin's edit and delete actions sit in the header.
 */
export function MomentCard({ moment }: { moment: PublicMoment }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const isAdmin = useIsAdmin();

  return (
    <article className="fuwari-card-base flex flex-col gap-3 p-5 md:p-6">
      <header className="flex items-center gap-3">
        <img
          src={getPublicImageSrc(
            siteConfig.theme.fuwari.avatar,
            PUBLIC_IMAGE_WIDTH.avatar,
          )}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold fuwari-text-90">
            {siteConfig.author}
          </span>
          <MomentTime
            moment={moment}
            className="text-sm font-medium fuwari-text-50"
          />
        </div>
        {isAdmin ? <MomentAdminActions moment={moment} /> : null}
      </header>
      {moment.text ? (
        <MomentText
          text={moment.text}
          className="text-base leading-relaxed fuwari-text-90"
        />
      ) : null}
      <MomentImages momentId={moment.id} images={moment.images} />
      {moment.video ? <MomentVideo video={moment.video} /> : null}
    </article>
  );
}
