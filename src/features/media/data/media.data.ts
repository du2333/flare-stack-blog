import { and, count, desc, eq, lt, or, sql, sum } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { escapeLikeString } from "@/features/media/data/helper";
import { MediaTable, PostMediaTable, GuitarTabMetadataTable, user } from "@/lib/db/schema";
import type { MediaCategory } from "@/features/media/media.schema";
import type { GuitarTabStatus } from "@/lib/db/schema/guitar-tab-metadata.table";

export type Media = typeof MediaTable.$inferSelect;

export async function insertMedia(
  db: DB,
  data: typeof MediaTable.$inferInsert,
): Promise<Media> {
  const [inserted] = await db.insert(MediaTable).values(data).returning();
  return inserted;
}

export async function deleteMedia(db: DB, key: string) {
  await db.delete(MediaTable).where(eq(MediaTable.key, key));
}

export async function updateMediaName(db: DB, key: string, name: string) {
  await db
    .update(MediaTable)
    .set({ fileName: name })
    .where(eq(MediaTable.key, key));
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * 获取媒体列表 (Cursor-based pagination)
 * @param cursor - 上一页最后一条记录的 id，用于分页
 * @param limit - 每页数量
 * @param search - 搜索文件名
 * @param unusedOnly - 是否只显示未被引用的媒体
 */
export async function getMediaList(
  db: DB,
  options?: {
    cursor?: number;
    limit?: number;
    search?: string;
    unusedOnly?: boolean;
    category?: MediaCategory;
  },
): Promise<{ items: Array<Media>; nextCursor: number | null }> {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    search,
    unusedOnly,
    category,
  } = options ?? {};

  // 构建条件
  const conditions: Array<SQL> = [];
  if (cursor) {
    conditions.push(lt(MediaTable.id, cursor));
  }
  if (search) {
    const pattern = `%${escapeLikeString(search)}%`;
    conditions.push(sql`${MediaTable.fileName} LIKE ${pattern} ESCAPE '\\'`);
  }

  // 按类别过滤
  if (category) {
    switch (category) {
      case "image":
        conditions.push(sql`${MediaTable.mimeType} LIKE 'image/%'`);
        // 排除专辑封面（它们存储在 album-covers/ 前缀下）
        conditions.push(
          sql`${MediaTable.key} NOT LIKE 'album-covers/%'`,
        );
        break;
      case "guitar-pro":
        conditions.push(
          or(
            sql`${MediaTable.mimeType} = 'application/x-guitar-pro'`,
            sql`(${MediaTable.mimeType} = 'application/octet-stream' AND (${MediaTable.key} LIKE '%.gp3' OR ${MediaTable.key} LIKE '%.gp4' OR ${MediaTable.key} LIKE '%.gp5' OR ${MediaTable.key} LIKE '%.gpx' OR ${MediaTable.key} LIKE '%.gp'))`,
          )!,
        );
        break;
      case "video":
        conditions.push(sql`${MediaTable.mimeType} LIKE 'video/%'`);
        break;
      case "audio":
        conditions.push(sql`${MediaTable.mimeType} LIKE 'audio/%'`);
        break;
      case "album-cover":
        conditions.push(sql`${MediaTable.key} LIKE 'album-covers/%'`);
        break;
    }
  }

  // 基础查询
  const baseQuery = db.select().from(MediaTable).$dynamic();

  // 如果只需要未引用的媒体
  if (unusedOnly) {
    // 使用 LEFT JOIN 排除存在于 PostMediaTable 中的记录
    const unusedQuery = db
      .select({
        media: MediaTable,
        postMediaId: PostMediaTable.postId,
      })
      .from(MediaTable)
      .leftJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
      .$dynamic();

    conditions.push(sql`${PostMediaTable.postId} IS NULL`);

    const items = await unusedQuery
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(MediaTable.id))
      .limit(limit + 1)
      .then((rows) => rows.map((row) => row.media));

    // 判断是否有下一页
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop(); // 移除多取的一条
    }

    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { items, nextCursor };
  }

  // 常规查询
  const items = await baseQuery
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(MediaTable.id))
    .limit(limit + 1);

  // 判断是否有下一页
  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop(); // 移除多取的一条
  }

  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

export async function getTotalMediaSize(db: DB) {
  const [result] = await db
    .select({ total: sum(MediaTable.sizeInBytes) })
    .from(MediaTable);

  return Number(result.total ?? 0);
}

// ── 吉他谱列表（含元数据 + 封面） ────────────────────

export interface GuitarTabWithMeta {
  id: number;
  key: string;
  fileName: string;
  sizeInBytes: number;
  createdAt: Date;
  // 元数据
  title: string | null;
  artist: string | null;
  album: string | null;
  tempo: number | null;
  trackCount: number | null;
  trackNames: string | null;
  // 封面
  coverKey: string | null;
  // 上传者
  uploaderName: string | null;
  uploaderImage: string | null;
  uploaderEmail: string | null;
  // slug
  slug: string | null;
  // 状态
  status: GuitarTabStatus;
}

/**
 * 公开吉他谱列表（分页）— 只返回 approved 状态
 */
export async function getGuitarTabsWithMetaPaginated(
  db: DB,
  options?: { page?: number; pageSize?: number; search?: string },
): Promise<{ items: GuitarTabWithMeta[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, search } = options ?? {};
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];

  if (search) {
    const pattern = `%${escapeLikeString(search)}%`;
    conditions.push(
      or(
        sql`${MediaTable.fileName} LIKE ${pattern} ESCAPE '\\'`,
        sql`${GuitarTabMetadataTable.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${GuitarTabMetadataTable.artist} LIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }

  // Guitar Pro 类型过滤
  conditions.push(
    or(
      sql`${MediaTable.mimeType} = 'application/x-guitar-pro'`,
      sql`(${MediaTable.mimeType} = 'application/octet-stream' AND (${MediaTable.key} LIKE '%.gp3' OR ${MediaTable.key} LIKE '%.gp4' OR ${MediaTable.key} LIKE '%.gp5' OR ${MediaTable.key} LIKE '%.gpx' OR ${MediaTable.key} LIKE '%.gp'))`,
    )!,
  );

  // 只显示已通过审核的
  conditions.push(
    sql`(${GuitarTabMetadataTable.status} = 'approved' OR ${GuitarTabMetadataTable.status} IS NULL)`,
  );

  const coverMedia = db
    .select({ id: MediaTable.id, key: MediaTable.key })
    .from(MediaTable)
    .as("cover_media");

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询总数
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(MediaTable)
    .leftJoin(
      GuitarTabMetadataTable,
      eq(MediaTable.id, GuitarTabMetadataTable.mediaId),
    )
    .where(whereClause);

  // 查询数据
  const rows = await db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
      sizeInBytes: MediaTable.sizeInBytes,
      createdAt: MediaTable.createdAt,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
      tempo: GuitarTabMetadataTable.tempo,
      trackCount: GuitarTabMetadataTable.trackCount,
      trackNames: GuitarTabMetadataTable.trackNames,
      coverKey: coverMedia.key,
      uploaderName: user.name,
      uploaderImage: user.image,
      uploaderEmail: user.email,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
    })
    .from(MediaTable)
    .leftJoin(
      GuitarTabMetadataTable,
      eq(MediaTable.id, GuitarTabMetadataTable.mediaId),
    )
    .leftJoin(
      coverMedia,
      eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id),
    )
    .leftJoin(
      user,
      eq(GuitarTabMetadataTable.uploaderId, user.id),
    )
    .where(whereClause)
    .orderBy(desc(MediaTable.id))
    .limit(pageSize)
    .offset(offset);

  const items: GuitarTabWithMeta[] = rows.map((r) => ({
    ...r,
    status: (r.status ?? "approved") as GuitarTabStatus,
  }));

  return { items, total: totalCount, page, pageSize };
}

/**
 * 管理后台吉他谱列表（cursor-based，含全部状态）
 */
export async function getGuitarTabsWithMeta(
  db: DB,
  options?: { cursor?: number; limit?: number; search?: string; status?: GuitarTabStatus },
): Promise<{ items: GuitarTabWithMeta[]; nextCursor: number | null }> {
  const { cursor, limit = 20, search, status: statusFilter } = options ?? {};

  const conditions: SQL[] = [];
  if (cursor) {
    conditions.push(lt(MediaTable.id, cursor));
  }
  if (search) {
    const pattern = `%${escapeLikeString(search)}%`;
    // 搜索 fileName 和 metadata 的 title / artist
    conditions.push(
      or(
        sql`${MediaTable.fileName} LIKE ${pattern} ESCAPE '\\'`,
        sql`${GuitarTabMetadataTable.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${GuitarTabMetadataTable.artist} LIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }

  // Guitar Pro 类型过滤
  conditions.push(
    or(
      sql`${MediaTable.mimeType} = 'application/x-guitar-pro'`,
      sql`(${MediaTable.mimeType} = 'application/octet-stream' AND (${MediaTable.key} LIKE '%.gp3' OR ${MediaTable.key} LIKE '%.gp4' OR ${MediaTable.key} LIKE '%.gp5' OR ${MediaTable.key} LIKE '%.gpx' OR ${MediaTable.key} LIKE '%.gp'))`,
    )!,
  );

  // 按状态过滤
  if (statusFilter) {
    conditions.push(eq(GuitarTabMetadataTable.status, statusFilter));
  }

  // 这里用一个 cover alias 来 JOIN 封面图
  const coverMedia = db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
    })
    .from(MediaTable)
    .as("cover_media");

  const rows = await db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
      sizeInBytes: MediaTable.sizeInBytes,
      createdAt: MediaTable.createdAt,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
      tempo: GuitarTabMetadataTable.tempo,
      trackCount: GuitarTabMetadataTable.trackCount,
      trackNames: GuitarTabMetadataTable.trackNames,
      coverKey: coverMedia.key,
      uploaderName: user.name,
      uploaderImage: user.image,
      uploaderEmail: user.email,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
    })
    .from(MediaTable)
    .leftJoin(
      GuitarTabMetadataTable,
      eq(MediaTable.id, GuitarTabMetadataTable.mediaId),
    )
    .leftJoin(
      coverMedia,
      eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id),
    )
    .leftJoin(
      user,
      eq(GuitarTabMetadataTable.uploaderId, user.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(MediaTable.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  const nextCursor = hasMore ? (rows[rows.length - 1]?.id ?? null) : null;

  const items: GuitarTabWithMeta[] = rows.map((r) => ({
    ...r,
    status: (r.status ?? "approved") as GuitarTabStatus,
  }));

  return { items, nextCursor };
}

/**
 * 根据 media key 获取 media ID
 */
export async function getMediaByKey(
  db: DB,
  key: string,
): Promise<Media | undefined> {
  const [result] = await db
    .select()
    .from(MediaTable)
    .where(eq(MediaTable.key, key))
    .limit(1);
  return result;
}

