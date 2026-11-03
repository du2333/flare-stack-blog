import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type {
  DirectVideo,
  VideoMeta,
  VideoProvider,
  VideoSource,
} from "@/features/posts/utils/video-source";
import {
  EMPTY_VIDEO_META,
  formatVideoDuration,
  videoCoverUrl,
  videoEmbedUrl,
  videoPageUrl,
  videoThumbnailUrl,
} from "@/features/posts/utils/video-source";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function videoProviderName(provider: VideoProvider) {
  return provider === "bilibili"
    ? m.video_provider_bilibili()
    : m.video_provider_youtube();
}

/** The host a Direct Video is at: its page's when it has one, else its file's. */
export function directVideoHost(video: DirectVideo) {
  try {
    return new URL(video.pageUrl ?? video.src).hostname;
  } catch {
    return "";
  }
}

/**
 * A video's still in a 16:9 frame: its cover where one is known, otherwise a
 * plain backdrop, under a play mark, its title and length. The frame's ratio
 * holds the space before anything loads.
 */
function PosterCard({
  thumbnail,
  label,
  title,
  duration,
  className,
}: {
  thumbnail: string | null;
  label: string;
  title: string | null;
  duration: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full aspect-video overflow-hidden rounded-xl bg-neutral-800",
        className,
      )}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          // Bilibili's image CDN refuses other sites' referrers, and a Direct
          // Video's cover sits on a host the Admin chose, which has no
          // business learning which post a reader is on.
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-(--fuwari-primary)/40 via-neutral-800 to-neutral-900" />
      )}
      <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-hover:scale-110 group-active:scale-95 sm:h-16 sm:w-16">
          <Play
            className="ml-1 h-5 w-5 sm:h-7 sm:w-7"
            fill="currentColor"
            strokeWidth={0}
          />
        </span>
      </div>
      {title ? (
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-t from-black/75 via-black/40 to-transparent px-3 pt-8 pb-2.5 text-white sm:px-4 sm:pt-10 sm:pb-3">
          <div className="min-w-0 flex-1">
            <div className="hidden text-xs font-medium text-white/75 sm:block">
              {label}
            </div>
            <div className="mt-0.5 line-clamp-1 text-sm font-medium leading-snug sm:line-clamp-2 sm:text-base">
              {title}
            </div>
          </div>
          {duration ? (
            <span className="shrink-0 rounded-md bg-black/55 px-1.5 py-0.5 text-xs font-medium tabular-nums">
              {formatVideoDuration(duration)}
            </span>
          ) : null}
        </div>
      ) : (
        <span className="absolute left-3 bottom-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * A Bilibili or YouTube video's still: its cover where one is known
 * (YouTube's fixed thumbnail, or the Bilibili cover looked up when it was
 * embedded), otherwise a plain backdrop.
 */
export function VideoPoster({
  source,
  meta = EMPTY_VIDEO_META,
  className,
}: {
  source: VideoSource;
  meta?: VideoMeta;
  className?: string;
}) {
  return (
    <PosterCard
      thumbnail={
        meta.cover ? videoCoverUrl(meta.cover, 960) : videoThumbnailUrl(source)
      }
      label={
        videoProviderName(source.provider) +
        (source.page ? ` · P${source.page}` : "")
      }
      title={meta.title}
      duration={meta.duration}
      className={className}
    />
  );
}

/**
 * A Direct Video's still, drawn like the other videos'. Its cover is shown
 * as it is, because only Bilibili's CDN can resize one, and its label is the
 * host it is at.
 */
export function DirectVideoPoster({
  video,
  className,
}: {
  video: DirectVideo;
  className?: string;
}) {
  return (
    <PosterCard
      thumbnail={video.cover}
      label={directVideoHost(video)}
      title={video.title}
      duration={video.duration}
      className={className}
    />
  );
}

/**
 * An embedded video in a post. It shows the poster until a reader plays it,
 * and only then loads the provider's player, so a post with videos opens as
 * fast as one without; a link to the video's page sits below for readers the
 * player does not work for.
 */
export function VideoEmbed({
  source,
  meta,
}: {
  source: VideoSource;
  meta?: VideoMeta;
}) {
  const [playing, setPlaying] = useState(false);
  const name = videoProviderName(source.provider);

  return (
    <figure className="not-prose my-6">
      {playing ? (
        <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={videoEmbedUrl(source, { autoplay: true })}
            title={m.post_video_player({ provider: name })}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={
            meta?.title
              ? m.post_video_play_title({ provider: name, title: meta.title })
              : m.post_video_play({ provider: name })
          }
          className="group block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-(--fuwari-primary) focus-visible:ring-offset-2"
        >
          <VideoPoster source={source} meta={meta} />
        </button>
      )}
      <figcaption className="mt-2 flex justify-center text-sm">
        <a
          href={videoPageUrl(source)}
          target="_blank"
          rel="noopener noreferrer"
          className="no-styling inline-flex items-center gap-1 fuwari-text-50 transition-colors hover:text-(--fuwari-primary)"
        >
          {m.post_video_open({ provider: name })}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * A Direct Video in a post. It shows the poster until a reader plays it, and
 * only then lets the browser load the file, so a post with videos downloads
 * none of them on opening; a link to the page the video came from sits below
 * when there is one.
 */
export function DirectVideoEmbed({ video }: { video: DirectVideo }) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="not-prose my-6">
      {playing ? (
        <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
          <video
            src={video.src}
            poster={video.cover ?? undefined}
            controls
            autoPlay
            playsInline
            aria-label={m.post_video_player_direct()}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={
            video.title
              ? m.post_video_play_direct_title({ title: video.title })
              : m.post_video_play_direct()
          }
          className="group block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-(--fuwari-primary) focus-visible:ring-offset-2"
        >
          <DirectVideoPoster video={video} />
        </button>
      )}
      {video.pageUrl ? (
        <figcaption className="mt-2 flex justify-center text-sm">
          <a
            href={video.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="no-styling inline-flex items-center gap-1 fuwari-text-50 transition-colors hover:text-(--fuwari-primary)"
          >
            {m.post_video_open_page()}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
