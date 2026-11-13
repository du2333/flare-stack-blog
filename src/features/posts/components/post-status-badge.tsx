import { Badge } from "@/components/ui/badge";
import { postStateLabel, type PostState } from "./post-state";
import "./post-status-badge.css";

const TONES = {
  draft: "neutral",
  published: "success",
  "published-changed": "warning",
} as const;

/**
 * A Post's state as a chip. In a list where nearly every Post is published,
 * `quiet` writes 已发布 as plain secondary text and keeps the chip for the
 * states that need a look; the text is still there for every row.
 */
export function PostStatusBadge({
  state,
  quiet = false,
}: {
  state: PostState;
  quiet?: boolean;
}) {
  if (quiet && state === "published")
    return <span className="post-status-quiet">{postStateLabel(state)}</span>;
  return <Badge tone={TONES[state]}>{postStateLabel(state)}</Badge>;
}
