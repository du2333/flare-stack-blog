import type { MomentRow } from "@/features/moments/data/moments.data";
import type {
  AdminMoment,
  PublicMoment,
} from "@/features/moments/schema/moments.schema";

/** A stored Moment as readers see it. */
export function toPublicMoment(row: MomentRow): PublicMoment {
  return {
    id: row.id,
    text: row.text,
    images: row.images.map(({ key, url, width, height }) => ({
      key,
      url,
      width,
      height,
    })),
    video: row.video ?? null,
    postedAt: row.postedAt,
    updatedAt: row.updatedAt,
    commentCount: row.commentCount,
  };
}

/** A stored Moment as the Admin reads it: as readers see it, with its token. */
export function toAdminMoment(row: MomentRow): AdminMoment {
  return { ...toPublicMoment(row), saveToken: row.saveToken };
}
