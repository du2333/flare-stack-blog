import {
  DirectVideoEmbed,
  VideoEmbed,
} from "@/features/posts/components/content/video-embed";
import {
  directVideoOf,
  videoMetaOf,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import type { MomentVideo as MomentVideoData } from "@/lib/db/schema";

/**
 * A Moment's video through the player a post body uses: Bilibili and YouTube
 * in their own player, a Direct Video in the browser's, each loaded only once
 * a reader plays it. A video the player cannot read shows nothing.
 */
export function MomentVideo({ video }: { video: MomentVideoData }) {
  const source = videoSourceOf(video);
  const direct = source ? null : directVideoOf(video);
  if (!source && !direct) return null;
  // The embeds carry a post body's vertical margin.
  return (
    <div className="[&>figure]:my-0">
      {source ? (
        <VideoEmbed source={source} meta={videoMetaOf(video)} />
      ) : direct ? (
        <DirectVideoEmbed video={direct} />
      ) : null}
    </div>
  );
}
