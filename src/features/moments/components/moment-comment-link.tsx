import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { m } from "@/paraglide/messages";

/**
 * A Moment's comment count with a comment icon, linking to the comment
 * section on its page. A Moment nobody commented on shows 「评论」 in place of
 * the number.
 */
export function MomentCommentLink({ moment }: { moment: PublicMoment }) {
  const { commentCount } = moment;
  return (
    <Link
      to="/moments/$id"
      params={{ id: String(moment.id) }}
      hash="comments"
      aria-label={
        commentCount > 0
          ? m.moments_comments_count({ count: commentCount })
          : m.moments_comments()
      }
      className={buttonClass({
        variant: "plain",
        size: "sm",
        className: "w-fit",
      })}
    >
      <MessageCircle size={16} aria-hidden="true" />
      <span>{commentCount > 0 ? commentCount : m.moments_comments()}</span>
    </Link>
  );
}
