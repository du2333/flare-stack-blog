import type { Tag } from "@/lib/db/schema";
import type {
  PublicPostCover,
  PublicPostSnapshot,
} from "@/lib/db/schema/posts.table";
import { estimateReadTimeMinutes } from "@/features/posts/utils/content";
import type { PostItem } from "@/features/posts/schema/posts.schema";

export function toPublicCover(
  cover: PublicPostCover | null | undefined,
): PostItem["cover"] {
  if (!cover) return null;
  return {
    key: cover.key,
    url: cover.url,
    width: cover.width,
    height: cover.height,
  };
}

export function toIsoOrNull(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function mapSnapshotToPublicPost(
  row: {
    id: number;
    status: "draft" | "published";
    createdAt: Date;
    updatedAt: Date;
    publicSnapshotJson: PublicPostSnapshot | null;
  },
  tags: Array<Tag> = [],
): PostItem | null {
  const snapshot = row.publicSnapshotJson;
  if (!snapshot) return null;

  return {
    id: row.id,
    title: snapshot.title,
    summary: snapshot.summary,
    slug: snapshot.slug,
    status: "published",
    publishedAt: new Date(snapshot.publishedAt),
    pinnedAt: snapshot.pinnedAt ? new Date(snapshot.pinnedAt) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    readTimeInMinutes: estimateReadTimeMinutes(snapshot.contentJson),
    tags,
    cover: toPublicCover(snapshot.cover),
  };
}
