import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareLink } from "@/lib/share";
import { m } from "@/paraglide/messages";

/** Shares a Post through the system's share sheet: its title and canonical address. */
export function PostShareButton({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  return (
    <Button
      variant="plain"
      icon={<Share2 size={16} aria-hidden="true" />}
      onClick={() => void shareLink({ title, url })}
    >
      {m.common_share()}
    </Button>
  );
}
