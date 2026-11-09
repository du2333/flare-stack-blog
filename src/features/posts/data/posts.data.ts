import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type {
  PostFilters,
  SortDirection,
  SortField,
} from "@/features/posts/data/helper";
import {
  adminPostTextColumns,
  buildPostOrderByClause,
  buildPostWhereClause,
  unpublishedChangesSql,
} from "@/features/posts/data/helper";
import {
  clearPublicTags,
  findPublicAssignments,
  hasPublicCategoryNamed,
  hasPublicTagNamed,
  publicCategoryValue,
  replacePublicTags,
} from "@/features/posts/data/public-assignments.data";
import { mapSnapshotToPublicPost } from "@/features/posts/public-snapshot";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { HOME_POSTS_PER_PAGE } from "@/features/posts/schema/posts.schema";
import { isPostBodyEmpty } from "@/features/posts/utils/is-post-body-empty";
import type { PostStatus, PublicPostSnapshot } from "@/lib/db/schema";
import { startsWithText } from "@/lib/db/text-match";
import { newSaveToken, PostsTable } from "@/lib/db/schema";
import { mediaReferenceGuards } from "@/features/posts/data/post-media.data";
import {
  keyForWrite,
  POST_PUBLIC_SLUG,
  POST_SLUG,
  settleUniqueKeys,
} from "@/lib/db/unique-keys";
import { uniqueKeyOf } from "@/lib/unicode-text";

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_SITEMAP_BATCH_SIZE = 500;

const snapshotPublishedAt = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`;

async function hydratePublicPosts(
  db: DB,
  rows: Array<{
    id: number;
    status: PostStatus;
    createdAt: Date;
    pinnedAt: Date | null;
    publicSnapshotJson: PublicPostSnapshot | null;
  }>,
): Promise<Array<PostItem>> {
  if (rows.length === 0) return [];
  const byId = await findPublicAssignments(
    db,
    rows.map((row) => row.id),
  );
  return rows.flatMap((row) => {
    const assignment = byId.get(row.id);
    const item = mapSnapshotToPublicPost(
      row,
      assignment?.tags ?? [],
      assignment?.category ?? null,
    );
    return item ? [item] : [];
  });
}

export type SitemapPostRow = {
  id: number;
  slug: string;
  publishedAt: Date | null;
  /** When publishing last replaced the snapshot; never the draft's updatedAt. */
  lastPublishedAt: Date | null;
};

/**
 * Media a write puts into the draft, recorded in the same batch so that it
 * cannot be deleted meanwhile; see `mediaReferenceGuards`.
 */
export type MediaReferences = { keys: Array<string>; mediaIds: Array<number> };

export async function insertPost(
  db: DB,
  data: Omit<
    typeof PostsTable.$inferInsert,
    "slugKey" | "publicSlugKey" | "saveToken"
  >,
  options: { media?: MediaReferences } = {},
) {
  const saveToken = newSaveToken();
  const insert = db
    .insert(PostsTable)
    .values({ ...data, slugKey: uniqueKeyOf(data.slug), saveToken })
    .returning();
  const guards = options.media
    ? mediaReferenceGuards(db, { saveToken }, options.media)
    : [];
  const [post] = guards.length
    ? (await db.batch([insert, ...guards]))[0]
    : await insert;
  return post;
}

export async function getPosts(
  db: DB,
  options: PostFilters & {
    offset?: number;
    limit?: number;
    sortDir?: SortDirection;
    sortBy?: SortField;
    includeContent?: boolean;
  } = {},
) {
  const {
    offset = 0,
    limit = DEFAULT_PAGE_SIZE,
    sortDir,
    sortBy,
    includeContent = false,
    ...filters
  } = options;
  const whereClause = buildPostWhereClause(filters);
  const publicScope = filters.taxonomy?.scope === "public";
  const orderByClause = buildPostOrderByClause(sortDir, sortBy, publicScope);
  const snapshotPublishedAtDate = sql<
    string | null
  >`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`.mapWith(
    (value) => (value == null ? null : new Date(value)),
  );

  const posts = await db
    .select({
      id: PostsTable.id,
      ...adminPostTextColumns(filters.taxonomy),
      publicSlug: PostsTable.publicSlug,
      status: PostsTable.status,
      hasUnpublishedChanges: unpublishedChangesSql().mapWith(Boolean),
      publishedAt: publicScope
        ? snapshotPublishedAtDate
        : PostsTable.publishedAt,
      // Pinning takes effect at once and is not part of the snapshot.
      pinnedAt: PostsTable.pinnedAt,
      categoryId: publicScope
        ? PostsTable.publicCategoryId
        : PostsTable.categoryId,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
      // contentJson is the editable draft body. In public-snapshot scope every
      // other column is read from publicSnapshotJson, so returning the draft
      // here would mix an unpublished body into a published row.
      ...(includeContent && !publicScope
        ? {
            contentJson: PostsTable.contentJson,
            saveToken: PostsTable.saveToken,
          }
        : {}),
    })
    .from(PostsTable)
    .limit(Math.min(limit, 50))
    .offset(offset)
    .orderBy(...orderByClause)
    .where(whereClause);
  return posts;
}

export async function getPostsCount(db: DB, options: PostFilters = {}) {
  const whereClause = buildPostWhereClause(options);
  const totalNumberofPosts = await db
    .select({ count: count() })
    .from(PostsTable)
    .where(whereClause);
  return totalNumberofPosts[0].count;
}

/** Status facets use the same search predicate as the paginated Admin list. */
export async function getAdminPostStatusCounts(
  db: DB,
  options: Omit<PostFilters, "status" | "hasUnpublishedChanges"> = {},
) {
  const rows = await db
    .select({
      status: PostsTable.status,
      count: count(),
      unpublishedChanges: sql<number>`coalesce(sum(${unpublishedChangesSql()}), 0)`,
    })
    .from(PostsTable)
    .where(buildPostWhereClause(options))
    .groupBy(PostsTable.status);
  const published = rows.find((row) => row.status === "published");
  return {
    draft: rows.find((row) => row.status === "draft")?.count ?? 0,
    published: published?.count ?? 0,
    unpublishedChanges: Number(published?.unpublishedChanges ?? 0),
  };
}

export async function findReusableEmptyDraft(db: DB) {
  const rows = await db
    .select({
      id: PostsTable.id,
      contentJson: PostsTable.contentJson,
      saveToken: PostsTable.saveToken,
    })
    .from(PostsTable)
    .where(
      and(eq(PostsTable.status, "draft"), sql`trim(${PostsTable.title}) = ''`),
    )
    .orderBy(desc(PostsTable.updatedAt))
    .limit(20);

  for (const row of rows) {
    if (isPostBodyEmpty(row.contentJson)) {
      return row;
    }
  }
  return null;
}

/**
 * Get posts with cursor-based pagination
 * @param cursor - The id of the last item from previous page
 * @param limit - Number of items per page
 */
export async function getPostsCursor(
  db: DB,
  options: {
    cursor?: number;
    limit?: number;
    publicOnly?: boolean;
    tagName?: string;
    categoryName?: string;
    uncategorized?: boolean;
    excludePinned?: boolean;
  } = {},
): Promise<{
  items: Array<PostItem>;
  nextCursor: number | null;
}> {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    publicOnly = true,
    tagName,
    categoryName,
    uncategorized,
    excludePinned,
  } = options;

  const conditions = [];
  const baseConditions = buildPostWhereClause({ publicOnly });
  if (baseConditions) {
    conditions.push(baseConditions);
  }

  if (cursor) {
    const reference = await db.query.PostsTable.findFirst({
      where: eq(PostsTable.id, cursor),
      columns: { publicSnapshotJson: true, id: true },
    });
    const referencePublishedAt = reference?.publicSnapshotJson?.publishedAt;

    if (referencePublishedAt) {
      conditions.push(
        or(
          lt(snapshotPublishedAt, referencePublishedAt),
          and(
            eq(snapshotPublishedAt, referencePublishedAt),
            lt(PostsTable.id, reference.id),
          ),
        ),
      );
    } else if (reference) {
      conditions.push(lt(PostsTable.id, cursor));
    }
  }

  if (tagName) {
    conditions.push(hasPublicTagNamed(tagName));
  }

  if (uncategorized) {
    conditions.push(sql`${PostsTable.publicCategoryId} IS NULL`);
  } else if (categoryName) {
    conditions.push(hasPublicCategoryNamed(categoryName));
  }

  if (excludePinned) {
    conditions.push(isNull(PostsTable.pinnedAt));
  }

  const itemsWithPotentialNext = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      pinnedAt: PostsTable.pinnedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(limit + 1);

  const hasMore = itemsWithPotentialNext.length > limit;
  const rows = itemsWithPotentialNext.slice(0, limit);
  const items = await hydratePublicPosts(db, rows);
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

export async function getHomePosts(db: DB, requestedPage: number) {
  const total = await getPostsCount(db, { publicOnly: true });
  const totalPages = Math.max(1, Math.ceil(total / HOME_POSTS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      pinnedAt: PostsTable.pinnedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(buildPostWhereClause({ publicOnly: true }))
    .orderBy(
      desc(PostsTable.pinnedAt),
      desc(snapshotPublishedAt),
      desc(PostsTable.id),
    )
    .limit(HOME_POSTS_PER_PAGE)
    .offset((page - 1) * HOME_POSTS_PER_PAGE);
  return { items: await hydratePublicPosts(db, rows), page, totalPages };
}

export async function getPublishedPostsForSitemapBatch(
  db: DB,
  options: {
    cursor?: {
      publishedAt: Date;
      id: number;
    };
    limit?: number;
  } = {},
): Promise<Array<SitemapPostRow>> {
  const { cursor, limit = DEFAULT_SITEMAP_BATCH_SIZE } = options;

  const cursorPublishedAt = cursor?.publishedAt.toISOString();
  const rows = await db
    .select({
      id: PostsTable.id,
      publicSlug: PostsTable.publicSlug,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        cursor && cursorPublishedAt
          ? or(
              lt(snapshotPublishedAt, cursorPublishedAt),
              and(
                eq(snapshotPublishedAt, cursorPublishedAt),
                lt(PostsTable.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    slug: row.publicSlug ?? row.publicSnapshotJson?.slug ?? "",
    publishedAt: row.publicSnapshotJson
      ? new Date(row.publicSnapshotJson.publishedAt)
      : null,
    lastPublishedAt: row.publicSnapshotJson?.lastPublishedAt
      ? new Date(row.publicSnapshotJson.lastPublishedAt)
      : null,
  }));
}

/**
 * How readers know a Post, for links to it such as comment notifications:
 * the title and slug its Public Content Snapshot was published with (null
 * while it has none), beside the draft's.
 */
export async function findPostPublicName(db: DB, id: number) {
  const [row] = await db
    .select({
      title: PostsTable.title,
      slug: PostsTable.slug,
      publicTitle: sql<
        string | null
      >`json_extract(${PostsTable.publicSnapshotJson}, '$.title')`,
      publicSlug: PostsTable.publicSlug,
      hasPublicSnapshot:
        sql<number>`${PostsTable.publicSnapshotJson} IS NOT NULL`.mapWith(
          Boolean,
        ),
    })
    .from(PostsTable)
    .where(eq(PostsTable.id, id))
    .limit(1);
  return row ?? null;
}

export async function findPostById(db: DB, id: number) {
  const post = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.id, id),
    columns: { slugKey: false, publicSlugKey: false },
    with: {
      postTags: {
        with: {
          tag: { columns: { nameKey: false } },
        },
      },
      category: { columns: { nameKey: false } },
    },
  });

  if (!post) return null;

  const tags = post.postTags.map((pt) => pt.tag);
  const { postTags, ...rest } = post;
  return { ...rest, tags };
}

export async function findPinnedPosts(db: DB) {
  const rows = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      pinnedAt: PostsTable.pinnedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.pinnedAt),
      ),
    )
    .orderBy(desc(PostsTable.pinnedAt));

  return hydratePublicPosts(db, rows);
}

export async function findPostsByIds(db: DB, ids: number[]) {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      pinnedAt: PostsTable.pinnedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        inArray(PostsTable.id, ids),
      ),
    );

  return hydratePublicPosts(db, rows);
}

export async function findPostBySlug(
  db: DB,
  slug: string,
  options: { publicOnly?: boolean } = {},
) {
  const { publicOnly = false } = options;

  if (publicOnly) {
    const row = await db.query.PostsTable.findFirst({
      where: and(
        eq(PostsTable.publicSlug, slug),
        isNotNull(PostsTable.publicSnapshotJson),
      ),
    });
    if (!row?.publicSnapshotJson) return null;
    const [item] = await hydratePublicPosts(db, [row]);
    return item
      ? {
          ...row,
          ...item,
          contentJson: row.publicSnapshotJson.contentJson,
          tags: item.tags ?? [],
        }
      : null;
  }

  const post = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.slug, slug),
    with: {
      postTags: {
        with: {
          tag: { columns: { nameKey: false } },
        },
      },
    },
  });

  if (!post) return null;

  const tags = post.postTags.map((pt) => pt.tag);
  const { postTags, ...rest } = post;
  return { ...rest, tags };
}

/**
 * Matches the Post, and with `saveToken` only while the Post still carries
 * it, so the compare and the write are one statement.
 */
function postToWrite(id: number, saveToken: string | undefined) {
  return and(
    eq(PostsTable.id, id),
    saveToken === undefined ? undefined : eq(PostsTable.saveToken, saveToken),
  );
}

/**
 * Re-reads the Post after a write, keeping the saveToken that write set: a
 * later write may land before the read, and its token must not be handed out
 * for content the caller never saw.
 */
async function findWrittenPost(db: DB, id: number, saveToken: string) {
  const post = await findPostById(db, id);
  return post && { ...post, saveToken };
}

const FINGERPRINTED_FIELDS = [
  "title",
  "summary",
  "slug",
  "contentJson",
  "publishedAt",
  "coverMediaId",
  "categoryId",
] as const;

/** Whether a write touches a field Unpublished Changes are decided by. */
function changesFingerprintedFields(data: object) {
  return FINGERPRINTED_FIELDS.some((field) => field in data);
}

/**
 * Returns null when no Post was written: it does not exist, or it no longer
 * carries the stated `saveToken`.
 */
export async function updatePost(
  db: DB,
  id: number,
  data: Partial<
    Omit<
      typeof PostsTable.$inferInsert,
      | "id"
      | "createdAt"
      | "saveToken"
      | "draftFingerprint"
      | "publishedFingerprint"
      | "slugKey"
      | "publicSlugKey"
    >
  >,
  options: { saveToken?: string; media?: MediaReferences } = {},
) {
  // Set here rather than by $onUpdate so the media guards can find the row.
  const saveToken = newSaveToken();
  const update = db
    .update(PostsTable)
    .set({
      ...data,
      ...(data.slug !== undefined && {
        slugKey: keyForWrite(PostsTable.slug, PostsTable.slugKey, data.slug),
      }),
      ...(changesFingerprintedFields(data) && { draftFingerprint: null }),
      saveToken,
    })
    .where(postToWrite(id, options.saveToken))
    .returning({ saveToken: PostsTable.saveToken });
  const guards = options.media
    ? mediaReferenceGuards(db, { postId: id, saveToken }, options.media)
    : [];
  const [written] = guards.length
    ? (await db.batch([update, ...guards]))[0]
    : await update;
  if (!written) return null;
  return await findWrittenPost(db, id, written.saveToken);
}

const fingerprintMissing = and(
  eq(PostsTable.status, "published"),
  or(
    sql`${PostsTable.draftFingerprint} IS NULL`,
    sql`${PostsTable.publishedFingerprint} IS NULL`,
  ),
);

/** Whether a Published Post has a fingerprint not computed yet. */
export async function hasPostsWithoutFingerprints(db: DB) {
  const [row] = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(fingerprintMissing)
    .limit(1);
  return row !== undefined;
}

/** Published Posts with a fingerprint not computed yet, by ascending id. */
export async function findPostsWithoutFingerprints(
  db: DB,
  options: { postId?: number; afterId?: number; limit: number },
) {
  return await db.query.PostsTable.findMany({
    where: and(
      fingerprintMissing,
      options.postId === undefined
        ? undefined
        : eq(PostsTable.id, options.postId),
      options.afterId === undefined
        ? undefined
        : gt(PostsTable.id, options.afterId),
    ),
    orderBy: asc(PostsTable.id),
    limit: options.limit,
    with: { postTags: true },
  });
}

/**
 * Stores computed fingerprints, each only where the column is still null and
 * only while the Post carries the token it was computed from. Leaves the
 * token and updatedAt as they are: computing a fingerprint is not a save.
 */
export async function writeFingerprints(
  db: DB,
  rows: Array<{
    id: number;
    saveToken: string;
    draftFingerprint: string | null;
    publishedFingerprint: string | null;
  }>,
) {
  const [head, ...rest] = rows.map((row) =>
    db
      .update(PostsTable)
      .set({
        draftFingerprint: sql`coalesce(${PostsTable.draftFingerprint}, ${row.draftFingerprint})`,
        publishedFingerprint: sql`coalesce(${PostsTable.publishedFingerprint}, ${row.publishedFingerprint})`,
        saveToken: sql`${PostsTable.saveToken}`,
        updatedAt: sql`${PostsTable.updatedAt}`,
      })
      .where(
        and(eq(PostsTable.id, row.id), eq(PostsTable.saveToken, row.saveToken)),
      ),
  );
  if (!head) return;
  await db.batch([head, ...rest]);
}

export async function findPostSaveToken(db: DB, id: number) {
  const [post] = await db
    .select({ saveToken: PostsTable.saveToken })
    .from(PostsTable)
    .where(eq(PostsTable.id, id));
  return post?.saveToken ?? null;
}

export async function findPostContentJson(db: DB, id: number) {
  const [post] = await db
    .select({ contentJson: PostsTable.contentJson })
    .from(PostsTable)
    .where(eq(PostsTable.id, id));
  return post?.contentJson ?? null;
}

export async function findPostSlug(db: DB, id: number) {
  const [post] = await db
    .select({ slug: PostsTable.slug })
    .from(PostsTable)
    .where(eq(PostsTable.id, id));
  return post?.slug ?? null;
}

/**
 * Writes the Public Content Snapshot together with the draft fields publishing
 * settles and the public Category and Tags the snapshot assigns, in one batch
 * (one transaction). With `saveToken`, nothing is written unless the Post
 * still carries it, so what goes live is the draft that was read: the snapshot
 * update is the only guarded statement, and the public Tags are written only
 * when the Post then carries the new token that update set.
 */
export async function writePublicSnapshot(
  db: DB,
  id: number,
  snapshot: PublicPostSnapshot,
  options: {
    draft?: Partial<
      Pick<typeof PostsTable.$inferInsert, "publishedAt" | "contentJson">
    >;
    saveToken?: string;
    /**
     * Fingerprint of the draft as read, which the snapshot was built from.
     * `readSaveToken` is the token that read carried.
     */
    fingerprint?: { value: string; readSaveToken: string };
  } = {},
) {
  const draft = options.draft ?? {};
  const saveToken = newSaveToken();
  const snapshotWrite = db
    .update(PostsTable)
    .set({
      ...draft,
      publicSnapshotJson: snapshot,
      publicSlug: snapshot.slug,
      publicSlugKey: keyForWrite(
        PostsTable.publicSlug,
        PostsTable.publicSlugKey,
        snapshot.slug,
      ),
      status: "published",
      ...(options.fingerprint && {
        publishedFingerprint: options.fingerprint.value,
        // The draft is that read only if nothing saved it since; otherwise
        // leave it to be computed again.
        draftFingerprint: sql`CASE WHEN ${PostsTable.saveToken} = ${options.fingerprint.readSaveToken} THEN ${options.fingerprint.value} END`,
      }),
      // Publishing alone leaves updatedAt; settling a draft field moves it.
      ...(Object.keys(draft).length === 0 && {
        updatedAt: sql`${PostsTable.updatedAt}`,
      }),
      publicCategoryId: publicCategoryValue(snapshot.categoryId),
      saveToken,
    })
    .where(postToWrite(id, options.saveToken))
    .returning({ saveToken: PostsTable.saveToken });
  const [[written]] = await db.batch([
    snapshotWrite,
    ...replacePublicTags(db, id, snapshot.tagIds, saveToken),
  ]);
  if (!written) return null;
  return await findWrittenPost(db, id, written.saveToken);
}

/**
 * Pins or unpins the Post in one statement. Pinning an already pinned Post
 * keeps its place. Leaves updatedAt alone; the row write replaces saveToken.
 */
export async function setPostPinned(db: DB, id: number, pinned: boolean) {
  const [written] = await db
    .update(PostsTable)
    .set({
      pinnedAt: pinned
        ? sql`coalesce(${PostsTable.pinnedAt}, unixepoch())`
        : null,
      updatedAt: sql`${PostsTable.updatedAt}`,
      // The pin is not part of the draft, so an open editor keeps its token.
      saveToken: sql`${PostsTable.saveToken}`,
    })
    .where(eq(PostsTable.id, id))
    .returning({
      publicSlug: PostsTable.publicSlug,
      saveToken: PostsTable.saveToken,
    });
  return written ?? null;
}

export async function clearPublicSnapshot(db: DB, id: number) {
  const snapshotClear = db
    .update(PostsTable)
    .set({
      publicSnapshotJson: null,
      publicSlug: null,
      publicSlugKey: null,
      publishedFingerprint: null,
      status: "draft",
      updatedAt: sql`${PostsTable.updatedAt}`,
      publicCategoryId: null,
    })
    .where(eq(PostsTable.id, id))
    .returning({ saveToken: PostsTable.saveToken });
  const [[written]] = await db.batch([snapshotClear, clearPublicTags(db, id)]);
  if (!written) return null;
  return await findWrittenPost(db, id, written.saveToken);
}

/**
 * Whether another Post's live page uses `slug`, compared by its unique key:
 * ignoring case and NFKC forms.
 */
export async function publicSlugExists(
  db: DB,
  slug: string,
  options: { excludeId?: number } = {},
): Promise<boolean> {
  await settleUniqueKeys(db, POST_PUBLIC_SLUG);
  const conditions = [eq(PostsTable.publicSlugKey, uniqueKeyOf(slug))];
  if (options.excludeId) {
    conditions.push(ne(PostsTable.id, options.excludeId));
  }
  const results = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(and(...conditions))
    .limit(1);
  return results.length > 0;
}

export async function deletePost(db: DB, id: number) {
  await db.delete(PostsTable).where(eq(PostsTable.id, id));
}

/**
 * Whether another Post uses `slug` as its slug or as the slug of its live
 * page, which publishing that Post would keep or take, compared by the unique
 * key: ignoring case and NFKC forms. The database refuses a duplicate slug on
 * its own; a slug equal to another Post's live page only this check refuses.
 * @param excludeId - Optional post ID to exclude (for editing existing posts)
 */
export async function slugExists(
  db: DB,
  slug: string,
  options: { excludeId?: number } = {},
): Promise<boolean> {
  const { excludeId } = options;
  await settleUniqueKeys(db, POST_SLUG);
  await settleUniqueKeys(db, POST_PUBLIC_SLUG);
  const key = uniqueKeyOf(slug);
  const conditions = [
    or(eq(PostsTable.slugKey, key), eq(PostsTable.publicSlugKey, key)),
  ];
  if (excludeId) {
    conditions.push(ne(PostsTable.id, excludeId));
  }
  const results = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(and(...conditions))
    .limit(1);
  return results.length > 0;
}

/**
 * 找出所有长得像 "baseSlug-%" 的 Slug
 */
export async function findSimilarSlugs(
  db: DB,
  baseSlug: string,
  options: { excludeId?: number } = {},
) {
  // Ignores the case of ASCII letters, as slugExists does.
  const conditions = [
    or(
      startsWithText(PostsTable.slug, `${baseSlug}-`),
      startsWithText(PostsTable.publicSlug, `${baseSlug}-`),
    ),
  ];

  // 如果是编辑文章，要排除掉自己，防止把自己算作冲突
  if (options.excludeId) {
    conditions.push(ne(PostsTable.id, options.excludeId));
  }

  const results = await db
    .select({ slug: PostsTable.slug, publicSlug: PostsTable.publicSlug })
    .from(PostsTable)
    .where(and(...conditions));

  return results.flatMap((r) =>
    r.publicSlug ? [r.slug, r.publicSlug] : [r.slug],
  );
}

export async function findAdjacentPublicPosts(db: DB, slug: string) {
  const currentPost = await db.query.PostsTable.findFirst({
    where: and(
      eq(PostsTable.publicSlug, slug),
      isNotNull(PostsTable.publicSnapshotJson),
    ),
    columns: { id: true, publicSnapshotJson: true },
  });

  const publishedAt = currentPost?.publicSnapshotJson?.publishedAt;
  if (!currentPost || !publishedAt) {
    return { newer: null, older: null };
  }

  const snapshotTitle = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.title')`;

  const [newer] = await db
    .select({
      slug: PostsTable.publicSlug,
      title: snapshotTitle,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
        or(
          gt(snapshotPublishedAt, publishedAt),
          and(
            eq(snapshotPublishedAt, publishedAt),
            gt(PostsTable.id, currentPost.id),
          ),
        ),
      ),
    )
    .orderBy(asc(snapshotPublishedAt), asc(PostsTable.id))
    .limit(1);

  const [older] = await db
    .select({
      slug: PostsTable.publicSlug,
      title: snapshotTitle,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
        or(
          lt(snapshotPublishedAt, publishedAt),
          and(
            eq(snapshotPublishedAt, publishedAt),
            lt(PostsTable.id, currentPost.id),
          ),
        ),
      ),
    )
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(1);

  return {
    newer: newer?.slug ? { slug: newer.slug, title: newer.title } : null,
    older: older?.slug ? { slug: older.slug, title: older.title } : null,
  };
}
