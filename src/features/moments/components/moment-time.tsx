import { Link } from "@tanstack/react-router";
import { useMomentClock } from "@/features/moments/hooks/use-moment-clock";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { showsRelativeMomentTime } from "@/features/moments/utils/moment-time";
import { formatPublicPostDate } from "@/features/posts/utils/format-public-post-date";
import { formatTimeAgo } from "@/lib/utils";

/**
 * When a Moment was posted: how long ago within 7 days, the date after. It
 * is a plain `<time>`, for places that are a link already.
 */
export function MomentTimeText({
  postedAt,
  className,
}: {
  postedAt: PublicMoment["postedAt"];
  className?: string;
}) {
  const now = useMomentClock();
  const relative = now !== null && showsRelativeMomentTime(postedAt, now);
  return (
    <time
      dateTime={new Date(postedAt).toISOString()}
      title={formatPublicPostDate(postedAt)}
      className={className}
    >
      {relative ? formatTimeAgo(postedAt) : formatPublicPostDate(postedAt)}
    </time>
  );
}

/** The time of a Moment, linking to the Moment's own page. */
export function MomentTime({
  moment,
  className,
}: {
  moment: Pick<PublicMoment, "id" | "postedAt">;
  className?: string;
}) {
  return (
    <Link
      to="/moments/$id"
      params={{ id: String(moment.id) }}
      className="fuwari-expand-animation -mx-1.5 -my-1 w-fit rounded-md px-1.5 py-1 hover:text-(--fuwari-primary)"
    >
      <MomentTimeText postedAt={moment.postedAt} className={className} />
    </Link>
  );
}
