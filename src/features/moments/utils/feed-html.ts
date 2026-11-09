import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { splitMomentText } from "@/features/moments/utils/moment-text";
import {
  absolute,
  linkFeedHtml,
  videoFeedHtml,
} from "@/features/posts/utils/feed-html";
import { escapeCodeHtml as escape } from "@/lib/plain-code-html";

/*
 * A Moment as the HTML a feed reader shows, written as a post body is
 * (`renderFeedHtml`): the text with its line breaks and links, then the
 * images with absolute addresses, or the video.
 */

function textHtml(text: string, origin: string) {
  return splitMomentText(text)
    .map((part) =>
      part.type === "link"
        ? linkFeedHtml({ href: part.value }, origin, escape(part.value))
        : escape(part.value).replace(/\r\n?|\n/g, "<br>"),
    )
    .join("");
}

export function renderMomentFeedHtml(
  moment: Pick<PublicMoment, "text" | "images" | "video">,
  origin: string,
): string {
  const html: Array<string> = [];
  if (moment.text.trim()) html.push(`<p>${textHtml(moment.text, origin)}</p>`);
  for (const image of moment.images) {
    html.push(
      `<p><img src="${escape(absolute(image.url, origin))}" alt=""></p>`,
    );
  }
  if (moment.video) html.push(videoFeedHtml(moment.video));
  return html.join("");
}
