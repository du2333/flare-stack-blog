import type { SQL } from "drizzle-orm";
import { and, desc, eq, lt, sql, sum } from "drizzle-orm";
import { escapeLikeString } from "@/features/media/data/helper";
import { MediaTable, PostMediaTable } from "@/lib/db/schema";

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
  },
): Promise<{ items: Array<Media>; nextCursor: number | null }> {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    search,
    unusedOnly,
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
