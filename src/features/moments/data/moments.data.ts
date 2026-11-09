import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  CommentsTable,
  MediaTable,
  MomentImagesTable,
  MomentsTable,
  newSaveToken,
  type Moment,
  type MomentVideo,
} from "@/lib/db/schema";

export type MomentImageRow = {
  mediaId: number;
  key: string;
  url: string;
  width: number | null;
  height: number | null;
};

export type MomentRow = Moment & {
  images: Array<MomentImageRow>;
  commentCount: number;
};

/**
 * A Moment's published Comments, roots and replies, as a Post's public count
 * is made (ADR 0014): deleted placeholders are not counted. The Moment's id
 * is written out with its table: a query on one table leaves its columns
 * unqualified, and a bare `id` here would be the Comment's.
 */
const publishedCommentCount =
  sql<number>`(SELECT count(*) FROM ${CommentsTable} WHERE ${CommentsTable.momentId} = ${sql.identifier("moments")}.${sql.identifier("id")} AND ${CommentsTable.status} = 'published')`.mapWith(
    Number,
  );

const momentColumns = {
  ...getTableColumns(MomentsTable),
  commentCount: publishedCommentCount,
};

/** What a write sets: the fields it states, the images by Media id. */
export type MomentWrite = {
  text?: string;
  video?: MomentVideo | null;
  mediaIds?: Array<number>;
};

const imageColumns = {
  momentId: MomentImagesTable.momentId,
  mediaId: MediaTable.id,
  key: MediaTable.key,
  url: MediaTable.url,
  width: MediaTable.width,
  height: MediaTable.height,
};

async function withImages<TMoment extends Moment>(
  db: DB,
  moments: Array<TMoment>,
): Promise<Array<TMoment & { images: Array<MomentImageRow> }>> {
  if (moments.length === 0) return [];
  const rows = await db
    .select(imageColumns)
    .from(MomentImagesTable)
    .innerJoin(MediaTable, eq(MediaTable.id, MomentImagesTable.mediaId))
    .where(
      inArray(
        MomentImagesTable.momentId,
        moments.map((moment) => moment.id),
      ),
    )
    .orderBy(asc(MomentImagesTable.momentId), asc(MomentImagesTable.position));
  const byMoment = new Map<number, Array<MomentImageRow>>();
  for (const { momentId, ...image } of rows) {
    const images = byMoment.get(momentId) ?? [];
    images.push(image);
    byMoment.set(momentId, images);
  }
  return moments.map((moment) => ({
    ...moment,
    images: byMoment.get(moment.id) ?? [],
  }));
}

export async function countMoments(db: DB) {
  const [row] = await db.select({ total: count() }).from(MomentsTable);
  return Number(row?.total ?? 0);
}

export async function hasMoments(db: DB) {
  const [row] = await db
    .select({ id: MomentsTable.id })
    .from(MomentsTable)
    .limit(1);
  return row !== undefined;
}

/** Moments newest first, as the public list and the home sidebar show them. */
export async function findMoments(
  db: DB,
  options: { limit: number; offset?: number },
) {
  const moments = await db
    .select(momentColumns)
    .from(MomentsTable)
    .orderBy(desc(MomentsTable.postedAt), desc(MomentsTable.id))
    .limit(options.limit)
    .offset(options.offset ?? 0);
  return withImages(db, moments);
}

export async function findMomentById(
  db: DB,
  id: number,
): Promise<MomentRow | null> {
  const [moment] = await db
    .select(momentColumns)
    .from(MomentsTable)
    .where(eq(MomentsTable.id, id))
    .limit(1);
  if (!moment) return null;
  const [row] = await withImages(db, [moment]);
  return row;
}

/**
 * What a Moment's Comments need of it: that it exists, and what names it in
 * notifications (its text, and whether it has a video).
 */
export async function findMomentHeadingById(db: DB, id: number) {
  const [row] = await db
    .select({
      id: MomentsTable.id,
      text: MomentsTable.text,
      hasVideo: sql<number>`${MomentsTable.video} IS NOT NULL`.mapWith(Boolean),
    })
    .from(MomentsTable)
    .where(eq(MomentsTable.id, id))
    .limit(1);
  return row ?? null;
}

/** The sitemap's rows: the ids after `cursor` in id order, with when each was last written. */
export async function findMomentsForSitemapBatch(
  db: DB,
  options: { cursor?: number; limit: number },
) {
  return db
    .select({ id: MomentsTable.id, updatedAt: MomentsTable.updatedAt })
    .from(MomentsTable)
    .where(
      options.cursor === undefined
        ? undefined
        : gt(MomentsTable.id, options.cursor),
    )
    .orderBy(asc(MomentsTable.id))
    .limit(options.limit);
}

export async function findMomentSaveToken(db: DB, id: number) {
  const [row] = await db
    .select({ saveToken: MomentsTable.saveToken })
    .from(MomentsTable)
    .where(eq(MomentsTable.id, id))
    .limit(1);
  return row?.saveToken ?? null;
}

/** The Media with `keys`, for a write to name its images by. */
export async function findMediaByKeys(db: DB, keys: Array<string>) {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return [];
  return db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
    })
    .from(MediaTable)
    .where(inArray(MediaTable.key, unique));
}

/**
 * Records `mediaIds` as the images, in order, of the Moment `moment` selects,
 * once the write before it in the batch has given that Moment its new token.
 * The ids travel as one JSON array, so 50 images are one statement with a
 * single bound value. Each id is looked up in `media` again, and one deleted
 * since fails the whole batch on `moment_images.media_id` NOT NULL
 * (`isMomentImageGone`). Deleting Media is one statement that refuses Media
 * in `moment_images` (`media.data.ts`), so either the write commits first and
 * the delete refuses, or the delete commits first and the write fails.
 */
function insertImages(db: DB, moment: SQL, mediaIds: Array<number>) {
  return db
    .insert(MomentImagesTable)
    .select(
      sql`SELECT ${moment}, CAST(${sql.raw("image.key")} AS integer), (SELECT ${MediaTable.id} FROM ${MediaTable} WHERE ${MediaTable.id} = ${sql.raw("image.value")}) FROM json_each(${JSON.stringify(mediaIds)}) AS ${sql.raw("image")} WHERE ${moment} IS NOT NULL`,
    );
}

/** Whether a batch failed because Media one of its images names was deleted. */
export function isMomentImageGone(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (
      /NOT NULL constraint failed:\s*moment_images\.media_id/i.test(
        current.message,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Inserts a Moment with its images in one batch; returns its id. */
export async function insertMoment(
  db: DB,
  data: { text: string; video: MomentVideo | null; mediaIds: Array<number> },
) {
  const saveToken = newSaveToken();
  const insert = db
    .insert(MomentsTable)
    .values({ text: data.text, video: data.video, saveToken })
    .returning({ id: MomentsTable.id });
  const moment = sql`(SELECT ${MomentsTable.id} FROM ${MomentsTable} WHERE ${MomentsTable.saveToken} = ${saveToken})`;
  const [inserted] =
    data.mediaIds.length > 0
      ? (await db.batch([insert, insertImages(db, moment, data.mediaIds)]))[0]
      : await insert;
  return inserted.id;
}

/**
 * Writes the stated fields of the Moment `id` and gives it a new saveToken.
 * With `saveToken`, it writes only while the Moment still carries it. Writing
 * images clears the video and writing a video clears the images, so a Moment
 * never ends with both, whatever another save did meanwhile. Returns the new
 * token, or null when nothing matched: no such Moment, or a newer save.
 */
export async function updateMoment(
  db: DB,
  id: number,
  data: MomentWrite,
  options: { saveToken?: string } = {},
) {
  const saveToken = newSaveToken();
  const video =
    data.video !== undefined
      ? data.video
      : data.mediaIds && data.mediaIds.length > 0
        ? null
        : undefined;
  const update = db
    .update(MomentsTable)
    .set({
      ...(data.text !== undefined && { text: data.text }),
      ...(video !== undefined && { video }),
      saveToken,
    })
    .where(
      and(
        eq(MomentsTable.id, id),
        options.saveToken === undefined
          ? undefined
          : eq(MomentsTable.saveToken, options.saveToken),
      ),
    )
    .returning({ saveToken: MomentsTable.saveToken });

  const rewritesImages =
    data.mediaIds !== undefined || (video ?? null) !== null;
  const statements: Array<BatchItem<"sqlite">> = [];
  if (rewritesImages) {
    const written = sql`(SELECT ${MomentsTable.id} FROM ${MomentsTable} WHERE ${MomentsTable.id} = ${id} AND ${MomentsTable.saveToken} = ${saveToken})`;
    statements.push(
      db
        .delete(MomentImagesTable)
        .where(
          and(eq(MomentImagesTable.momentId, id), sql`${written} IS NOT NULL`),
        ),
    );
    if (data.mediaIds && data.mediaIds.length > 0) {
      statements.push(insertImages(db, written, data.mediaIds));
    }
  }
  const [written] =
    statements.length > 0
      ? (await db.batch([update, ...statements]))[0]
      : await update;
  return written?.saveToken ?? null;
}

/** Deletes the Moment and its image rows; returns whether it existed. */
export async function deleteMoment(db: DB, id: number) {
  const deleted = await db
    .delete(MomentsTable)
    .where(eq(MomentsTable.id, id))
    .returning({ id: MomentsTable.id });
  return deleted.length > 0;
}
