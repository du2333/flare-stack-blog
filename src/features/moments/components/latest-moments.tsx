import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Image as ImageIcon, Play } from "lucide-react";
import { MomentTimeText } from "@/features/moments/components/moment-time";
import { latestMomentsQuery } from "@/features/moments/queries";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import {
  directVideoOf,
  videoCoverUrl,
  videoMetaOf,
  videoSourceOf,
  videoThumbnailUrl,
} from "@/features/posts/utils/video-source";
import {
  getPublicImageSrc,
  getPublicImageSrcSet,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const THUMBNAIL_WIDTH = PUBLIC_IMAGE_WIDTH.thumbnail;

/** What stands beside an entry, after it in a list and before it in a row: the first image with its count, or a video mark. */
function Thumbnail({ moment }: { moment: PublicMoment }) {
  const [first] = moment.images;
  if (first) {
    return (
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
        <img
          src={getPublicImageSrc(first.url, THUMBNAIL_WIDTH)}
          srcSet={getPublicImageSrcSet(first.url, [THUMBNAIL_WIDTH])}
          sizes="3.5rem"
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        {moment.images.length > 1 ? (
          <span
            title={m.moments_image_count({ count: moment.images.length })}
            className="absolute right-0.5 bottom-0.5 inline-flex items-center gap-0.5 rounded bg-black/55 px-1 text-[0.625rem] leading-4 font-medium text-white"
          >
            <ImageIcon size={10} aria-hidden="true" />
            {moment.images.length}
          </span>
        ) : null}
      </div>
    );
  }
  if (moment.video) {
    const source = videoSourceOf(moment.video);
    const cover = source
      ? videoMetaOf(moment.video).cover
      : directVideoOf(moment.video)?.cover;
    const src = source
      ? cover
        ? videoCoverUrl(cover, THUMBNAIL_WIDTH * 2)
        : videoThumbnailUrl(source)
      : cover;
    return (
      <div
        title={m.moments_video_badge()}
        className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800 text-white"
      >
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <span
          className={
            src
              ? "relative inline-flex size-6 items-center justify-center rounded-full bg-black/55"
              : "relative"
          }
        >
          <Play
            size={src ? 12 : 20}
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
        </span>
      </div>
    );
  }
  return null;
}

/**
 * The card of the latest Moments; it is not there when there are none. Two
 * forms on one markup. Narrow: the entries are a list under the title, a rule
 * between them. Wide (in a `card` container): they stand side by side, the
 * thumbnail before the text, two from 28rem and three from 42rem, and from
 * 56rem the title leads their row. From 20rem the title starts where the
 * other cards' titles do in their wide forms, without the accent mark.
 */
export function LatestMoments() {
  const { data: moments } = useSuspenseQuery(latestMomentsQuery);
  const { headingAccent } = useThemeRecipe();

  if (moments.length === 0) return null;

  return (
    <div className="fuwari-card-base fuwari-card-widget pb-3 @4xl/card:flex @4xl/card:items-center @4xl/card:py-3">
      <div className="fuwari-widget-title relative mt-4 mb-2 ml-(--theme-widget-pad-x,1.5rem) font-bold @xs/card:ml-(--theme-widget-pad-x,1.25rem) @4xl/card:my-0 @4xl/card:shrink-0">
        {headingAccent === "on" ? (
          <span
            className="absolute top-[5.5px] -left-4 h-4 w-1 rounded-md @xs/card:hidden"
            style={{ backgroundColor: "var(--theme-accent)" }}
          />
        ) : null}
        <Link
          to="/moments"
          className="inline-flex items-center gap-1 text-(--theme-widget-title-color) transition hover:text-(--theme-accent)"
        >
          {m.moments_latest_title()}
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      </div>
      <div className="px-(--theme-widget-pad-x,0.5rem) @md/card:grid @md/card:grid-cols-2 @md/card:gap-x-2 @2xl/card:grid-cols-3 @4xl/card:min-w-0 @4xl/card:flex-1">
        {moments.map((moment, index) => (
          <Link
            key={moment.id}
            to="/moments/$id"
            params={{ id: String(moment.id) }}
            className={cn(
              "fuwari-widget-row flex gap-3 rounded-lg px-2 py-2.5 transition hover:bg-(--theme-plain-bg-hover) active:bg-(--theme-plain-bg-active) @md/card:flex-row-reverse @md/card:items-center",
              index > 0 &&
                "border-t [border-top-style:var(--theme-rule-style)] border-(--theme-rule,var(--fuwari-divider)) @md/card:border-t-0",
              // Two abreast show two entries; the third waits for room.
              index >= 2 && "@md/card:hidden @2xl/card:flex",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <MomentTimeText
                postedAt={moment.postedAt}
                className="text-xs font-medium fuwari-text-50"
              />
              <p className="line-clamp-2 text-sm wrap-break-word fuwari-text-75">
                {moment.text ||
                  (moment.video
                    ? m.moments_video_only()
                    : m.moments_image_only())}
              </p>
            </div>
            <Thumbnail moment={moment} />
          </Link>
        ))}
      </div>
    </div>
  );
}
