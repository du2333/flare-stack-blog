import { useEffect, type RefObject } from "react";
import { toast } from "@/lib/toast";
import { m } from "@/paraglide/messages";
import { useJumpToHeading } from "./use-jump-to-heading";

/**
 * A plain click on a heading's `#` copies that section's link and jumps to
 * the heading the way the TOC does.
 */
export function useHeadingAnchors(containerRef: RefObject<HTMLElement | null>) {
  const jumpToHeading = useJumpToHeading();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        "a.anchor",
      );
      if (!anchor || !container.contains(anchor)) return;
      event.preventDefault();

      // Copy while the click still counts as a user gesture.
      const url = new URL(window.location.href);
      url.hash = anchor.hash;
      navigator.clipboard.writeText(url.toString()).then(
        () => toast.success(m.post_heading_link_copied()),
        () => toast.error(m.post_heading_link_copy_failed()),
      );
      void jumpToHeading(decodeURIComponent(anchor.hash.slice(1)));
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [containerRef, jumpToHeading]);
}
