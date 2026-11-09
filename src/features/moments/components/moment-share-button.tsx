import { useSuspenseQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteDomainQuery } from "@/features/config/queries";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { momentTitle } from "@/features/moments/utils/moment-share";
import { buildCanonicalUrl } from "@/lib/seo";
import { shareLink } from "@/lib/share";
import { m } from "@/paraglide/messages";

/**
 * Shares a Moment through the system's share sheet: its title, as its page
 * has it, and the page's canonical address.
 */
export function MomentShareButton({ moment }: { moment: PublicMoment }) {
  const { data: domain } = useSuspenseQuery(siteDomainQuery);

  return (
    <Button
      variant="plain"
      size="sm"
      className="w-fit"
      onClick={() =>
        void shareLink({
          title: momentTitle(
            moment,
            moment.video ? m.moments_video_only() : m.moments_image_only(),
          ),
          url: buildCanonicalUrl(domain, `/moments/${moment.id}`),
        })
      }
    >
      <Share2 size={16} aria-hidden="true" />
      <span>{m.common_share()}</span>
    </Button>
  );
}
