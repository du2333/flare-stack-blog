import type { JSONContent } from "@tiptap/core";
import { directVideoAddress } from "@/features/posts/utils/video-source";
import { isOpenableLinkHref } from "@/lib/links/openable-link-href";

/** The block attributes that hold a Direct Video's addresses. */
const DIRECT_VIDEO_ADDRESSES = ["src", "cover", "pageUrl"] as const;

/**
 * The link addresses in a post body that a post cannot show, such as
 * `javascript:` and `data:` links, each once, in reading order. A Direct
 * Video's file, poster and page count as links and must be HTTPS
 * (`directVideoAddress`), since the post would drop any other.
 */
export function refusedLinks(doc: JSONContent | null | undefined) {
  const refused = new Set<string>();
  const visit = (node: JSONContent) => {
    for (const mark of node.marks ?? []) {
      const href: unknown = mark.attrs?.href;
      if (mark.type === "link" && typeof href === "string") {
        if (!isOpenableLinkHref(href)) refused.add(href);
      }
    }
    if (node.type === "video" && node.attrs?.provider === "direct") {
      for (const name of DIRECT_VIDEO_ADDRESSES) {
        const address: unknown = node.attrs[name];
        if (typeof address === "string" && address.trim()) {
          if (!directVideoAddress(address)) refused.add(address);
        }
      }
    }
    node.content?.forEach(visit);
  };
  if (doc) visit(doc);
  return [...refused];
}
