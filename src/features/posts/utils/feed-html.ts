import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { schemaExtensions } from "@/features/posts/editor/schema";
import { publicLinkAttributes } from "@/features/posts/utils/public-link";
import {
  directVideoOf,
  videoMetaOf,
  videoPageUrl,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { escapeCodeHtml as escape } from "@/lib/plain-code-html";

/*
 * A post body as the HTML a feed reader shows (RSS content:encoded, Atom
 * content, JSON Feed content_html). A reader has no site around it, so
 * addresses are absolute, a provider's video is a link to its page, a Direct
 * Video is a `<video>` the reader may play with a link under it, and math is
 * its source in code. Links open as on the public page
 * (`publicLinkAttributes`).
 */

/** A `<video>` that loads nothing until played, then a link to its page. */
function directVideoHtml(attrs: Record<string, unknown>) {
  const video = directVideoOf(attrs);
  if (!video) return "";
  const src = escape(video.src);
  const poster = video.cover ? ` poster="${escape(video.cover)}"` : "";
  const page = escape(video.pageUrl ?? video.src);
  const text = escape(video.title ?? video.pageUrl ?? video.src);
  return `<video controls preload="none" src="${src}"${poster}></video><p><a href="${page}">${text}</a></p>`;
}

/** A video as a feed shows it, from the attributes of a video block. */
export function videoFeedHtml(attrs: Record<string, unknown>) {
  const source = videoSourceOf(attrs);
  if (!source) return directVideoHtml(attrs);
  const page = escape(videoPageUrl(source));
  const { title } = videoMetaOf(attrs);
  return `<p><a href="${page}">${title ? escape(title) : page}</a></p>`;
}

/** A site path as an address a reader outside the site can open. */
export function absolute(address: string, origin: string) {
  return address.startsWith("/") && !address.startsWith("//")
    ? `${origin}${address}`
    : address;
}

/** `children` (HTML) in a link that opens as on the public page. */
export function linkFeedHtml(
  attrs: Record<string, unknown>,
  origin: string,
  children: string,
) {
  const { href, title, target, rel } = publicLinkAttributes(attrs);
  const parts = [
    href !== undefined && `href="${escape(absolute(href, origin))}"`,
    title !== undefined && `title="${escape(title)}"`,
    `target="${target}"`,
    `rel="${rel}"`,
  ].filter(Boolean);
  return `<a ${parts.join(" ")}>${children}</a>`;
}

export function renderFeedHtml(
  content: JSONContent | null,
  origin: string,
): string {
  if (!content) return "";
  return renderToHTMLString({
    extensions: schemaExtensions,
    content,
    options: {
      nodeMapping: {
        image: ({ node }) => {
          const { src, alt } = node.attrs as {
            src?: string | null;
            alt?: string | null;
          };
          if (!src) return "";
          return `<img src="${escape(absolute(src, origin))}" alt="${escape(alt && alt !== "null" ? alt : "")}">`;
        },
        video: ({ node }) => videoFeedHtml(node.attrs),
        inlineMath: ({ node }) =>
          `<code>${escape(String(node.attrs.latex ?? ""))}</code>`,
        blockMath: ({ node }) =>
          `<pre><code>${escape(String(node.attrs.latex ?? ""))}</code></pre>`,
      },
      markMapping: {
        link: ({ mark, children }) =>
          linkFeedHtml(mark.attrs, origin, [children].flat().join("")),
      },
    },
  });
}
