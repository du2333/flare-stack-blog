import { desc, eq, sql, and, ne } from "drizzle-orm";
import {
  GuitarTabMetadataTable,
  type InsertGuitarTabMetadata,
  type GuitarTabMetadata,
  type GuitarTabStatus,
} from "@/lib/db/schema/guitar-tab-metadata.table";
import { MediaTable } from "@/lib/db/schema/media.table";
import { user } from "@/lib/db/schema/auth.table";

// ── 文件哈希去重 ──────────────────────────────────────

/**
 * 根据文件哈希查找已有的吉他谱元数据
 * 用于上传时判断文件是否重复
 */
export async function findByFileHash(
  db: DB,
  fileHash: string,
): Promise<(GuitarTabMetadata & { fileName: string }) | null> {
  const [result] = await db
    .select({
      id: GuitarTabMetadataTable.id,
      mediaId: GuitarTabMetadataTable.mediaId,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
      tempo: GuitarTabMetadataTable.tempo,
      trackCount: GuitarTabMetadataTable.trackCount,
      trackNames: GuitarTabMetadataTable.trackNames,
      coverMediaId: GuitarTabMetadataTable.coverMediaId,
      uploaderId: GuitarTabMetadataTable.uploaderId,
      fileHash: GuitarTabMetadataTable.fileHash,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
      createdAt: GuitarTabMetadataTable.createdAt,
      updatedAt: GuitarTabMetadataTable.updatedAt,
      fileName: MediaTable.fileName,
    })
    .from(GuitarTabMetadataTable)
    .innerJoin(MediaTable, eq(GuitarTabMetadataTable.mediaId, MediaTable.id))
    .where(eq(GuitarTabMetadataTable.fileHash, fileHash))
    .limit(1);
  return result ?? null;
}

/**
 * 更新文件哈希
 */
export async function updateFileHash(
  db: DB,
  mediaId: number,
  fileHash: string,
): Promise<void> {
  await db
    .update(GuitarTabMetadataTable)
    .set({ fileHash, updatedAt: new Date() })
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId));
}

/**
 * 插入或更新吉他谱元数据
 */
export async function upsertMetadata(
  db: DB,
  data: InsertGuitarTabMetadata,
): Promise<GuitarTabMetadata> {
  const [result] = await db
    .insert(GuitarTabMetadataTable)
    .values(data)
    .onConflictDoUpdate({
      target: GuitarTabMetadataTable.mediaId,
      set: {
        title: data.title,
        artist: data.artist,
        album: data.album,
        tempo: data.tempo,
        trackCount: data.trackCount,
        trackNames: data.trackNames,
        coverMediaId: data.coverMediaId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

/**
 * 根据 media ID 获取元数据
 */
export async function getByMediaId(
  db: DB,
  mediaId: number,
): Promise<GuitarTabMetadata | undefined> {
  const [result] = await db
    .select()
    .from(GuitarTabMetadataTable)
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId))
    .limit(1);
  return result;
}

/**
 * 根据 media ID 获取元数据，并 JOIN 封面 media 的 key
 */
export async function getByMediaIdWithCover(
  db: DB,
  mediaId: number,
): Promise<
  | (GuitarTabMetadata & { coverKey: string | null })
  | null
> {
  const coverMedia = db
    .select({ id: MediaTable.id, key: MediaTable.key })
    .from(MediaTable)
    .as("cover_media");

  const [result] = await db
    .select({
      id: GuitarTabMetadataTable.id,
      mediaId: GuitarTabMetadataTable.mediaId,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
      tempo: GuitarTabMetadataTable.tempo,
      trackCount: GuitarTabMetadataTable.trackCount,
      trackNames: GuitarTabMetadataTable.trackNames,
      coverMediaId: GuitarTabMetadataTable.coverMediaId,
      uploaderId: GuitarTabMetadataTable.uploaderId,
      fileHash: GuitarTabMetadataTable.fileHash,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
      createdAt: GuitarTabMetadataTable.createdAt,
      updatedAt: GuitarTabMetadataTable.updatedAt,
      coverKey: coverMedia.key,
    })
    .from(GuitarTabMetadataTable)
    .leftJoin(coverMedia, eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id))
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId))
    .limit(1);

  return result ?? null;
}

/**
 * 更新封面 media ID
 */
export async function updateCoverMediaId(
  db: DB,
  mediaId: number,
  coverMediaId: number,
): Promise<void> {
  await db
    .update(GuitarTabMetadataTable)
    .set({ coverMediaId, updatedAt: new Date() })
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId));
}

/**
 * 获取所有吉他谱类型的媒体（含已解析过的）
 * 用于强制重新解析
 */
export async function getAllGuitarProMedia(
  db: DB,
): Promise<Array<{ id: number; key: string; fileName: string }>> {
  const allMedia = await db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
    })
    .from(MediaTable);

  return allMedia.filter((m) => {
    const ext = m.key.split(".").pop()?.toLowerCase();
    return ["gp3", "gp4", "gp5", "gpx", "gp"].includes(ext || "");
  });
}

/**
 * 获取没有元数据的 guitar-pro 媒体 ID 列表
 * 用于批量补全已上传但未解析的文件
 */
export async function getMediaIdsWithoutMetadata(
  db: DB,
): Promise<Array<{ id: number; key: string; fileName: string }>> {
  // 找到所有 guitar-pro 类型的 media，且没有对应 metadata 记录
  const results = await db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
    })
    .from(MediaTable)
    .leftJoin(
      GuitarTabMetadataTable,
      eq(MediaTable.id, GuitarTabMetadataTable.mediaId),
    )
    .where(eq(GuitarTabMetadataTable.id, undefined as unknown as number))
    .limit(100);

  // leftJoin + null check 不太直观，换用子查询 / raw SQL
  // 重写为更可靠的方式
  return results;
}

export async function getUnprocessedGuitarTabs(
  db: DB,
): Promise<Array<{ id: number; key: string; fileName: string }>> {
  const allMedia = await db
    .select({
      id: MediaTable.id,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
    })
    .from(MediaTable);

  // 只保留 guitar-pro 类型
  const gpMedia = allMedia.filter((m) => {
    const ext = m.key.split(".").pop()?.toLowerCase();
    return ["gp3", "gp4", "gp5", "gpx", "gp"].includes(ext || "");
  });

  if (gpMedia.length === 0) return [];

  // 获取已有 metadata 的 mediaId
  const existing = await db
    .select({ mediaId: GuitarTabMetadataTable.mediaId })
    .from(GuitarTabMetadataTable);

  const existingSet = new Set(existing.map((e) => e.mediaId));
  return gpMedia.filter((m) => !existingSet.has(m.id));
}

/**
 * 删除指定 media 的元数据
 */
export async function deleteByMediaId(
  db: DB,
  mediaId: number,
): Promise<void> {
  await db
    .delete(GuitarTabMetadataTable)
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId));
}

/**
 * 获取有元数据但没有封面的吉他谱列表
 */
export async function getTabsWithoutCover(
  db: DB,
): Promise<
  Array<{
    mediaId: number;
    title: string | null;
    artist: string | null;
    album: string | null;
  }>
> {
  const results = await db
    .select({
      mediaId: GuitarTabMetadataTable.mediaId,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
    })
    .from(GuitarTabMetadataTable)
    .where(
      sql`${GuitarTabMetadataTable.coverMediaId} IS NULL AND (${GuitarTabMetadataTable.artist} IS NOT NULL OR ${GuitarTabMetadataTable.title} IS NOT NULL)`,
    );
  return results;
}

/**
 * 更新审核状态
 */
export async function updateStatus(
  db: DB,
  mediaId: number,
  status: GuitarTabStatus,
): Promise<void> {
  await db
    .update(GuitarTabMetadataTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId));
}

/**
 * 获取指定用户上传的吉他谱列表（含封面 + media 信息）
 */
export async function getByUploaderId(
  db: DB,
  uploaderId: string,
): Promise<
  Array<{
    id: number;
    mediaId: number;
    title: string;
    artist: string;
    status: GuitarTabStatus;
    coverKey: string | null;
    fileName: string;
    createdAt: Date;
  }>
> {
  const coverMedia = db
    .select({ id: MediaTable.id, key: MediaTable.key })
    .from(MediaTable)
    .as("cover_media");

  const results = await db
    .select({
      id: GuitarTabMetadataTable.id,
      mediaId: GuitarTabMetadataTable.mediaId,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      status: GuitarTabMetadataTable.status,
      coverKey: coverMedia.key,
      fileName: MediaTable.fileName,
      createdAt: GuitarTabMetadataTable.createdAt,
    })
    .from(GuitarTabMetadataTable)
    .innerJoin(
      MediaTable,
      eq(GuitarTabMetadataTable.mediaId, MediaTable.id),
    )
    .leftJoin(
      coverMedia,
      eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id),
    )
    .where(eq(GuitarTabMetadataTable.uploaderId, uploaderId))
    .orderBy(desc(GuitarTabMetadataTable.createdAt));

  return results as Array<{
    id: number;
    mediaId: number;
    title: string;
    artist: string;
    status: GuitarTabStatus;
    coverKey: string | null;
    fileName: string;
    createdAt: Date;
  }>;
}

// ── Slug 相关查询 ─────────────────────────────────────

export interface GuitarTabDetail {
  id: number;
  mediaId: number;
  key: string;
  fileName: string;
  sizeInBytes: number;
  title: string;
  artist: string;
  album: string;
  tempo: number;
  trackCount: number;
  trackNames: string;
  coverKey: string | null;
  uploaderName: string | null;
  uploaderImage: string | null;
  slug: string | null;
  status: GuitarTabStatus;
  createdAt: Date;
}

/**
 * 根据 slug 获取吉他谱详情（仅 approved）
 */
export async function getBySlug(
  db: DB,
  slug: string,
): Promise<GuitarTabDetail | null> {
  const coverMedia = db
    .select({ id: MediaTable.id, key: MediaTable.key })
    .from(MediaTable)
    .as("cover_media");

  const [result] = await db
    .select({
      id: GuitarTabMetadataTable.id,
      mediaId: GuitarTabMetadataTable.mediaId,
      key: MediaTable.key,
      fileName: MediaTable.fileName,
      sizeInBytes: MediaTable.sizeInBytes,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      album: GuitarTabMetadataTable.album,
      tempo: GuitarTabMetadataTable.tempo,
      trackCount: GuitarTabMetadataTable.trackCount,
      trackNames: GuitarTabMetadataTable.trackNames,
      coverKey: coverMedia.key,
      uploaderName: user.name,
      uploaderImage: user.image,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
      createdAt: GuitarTabMetadataTable.createdAt,
    })
    .from(GuitarTabMetadataTable)
    .innerJoin(MediaTable, eq(GuitarTabMetadataTable.mediaId, MediaTable.id))
    .leftJoin(coverMedia, eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id))
    .leftJoin(user, eq(GuitarTabMetadataTable.uploaderId, user.id))
    .where(
      and(
        eq(GuitarTabMetadataTable.slug, slug),
        eq(GuitarTabMetadataTable.status, "approved"),
      ),
    )
    .limit(1);

  return (result as GuitarTabDetail) ?? null;
}

/**
 * 获取同一首歌的其他版本（同 artist + title，不同 mediaId）
 */
export async function getRelatedTabs(
  db: DB,
  artist: string,
  title: string,
  excludeMediaId: number,
): Promise<Array<{
  mediaId: number;
  slug: string | null;
  fileName: string;
  trackCount: number;
  tempo: number;
  sizeInBytes: number;
  uploaderName: string | null;
  coverKey: string | null;
}>> {
  if (!artist && !title) return [];

  const coverMedia = db
    .select({ id: MediaTable.id, key: MediaTable.key })
    .from(MediaTable)
    .as("cover_media");

  const results = await db
    .select({
      mediaId: GuitarTabMetadataTable.mediaId,
      slug: GuitarTabMetadataTable.slug,
      fileName: MediaTable.fileName,
      trackCount: GuitarTabMetadataTable.trackCount,
      tempo: GuitarTabMetadataTable.tempo,
      sizeInBytes: MediaTable.sizeInBytes,
      uploaderName: user.name,
      coverKey: coverMedia.key,
    })
    .from(GuitarTabMetadataTable)
    .innerJoin(MediaTable, eq(GuitarTabMetadataTable.mediaId, MediaTable.id))
    .leftJoin(coverMedia, eq(GuitarTabMetadataTable.coverMediaId, coverMedia.id))
    .leftJoin(user, eq(GuitarTabMetadataTable.uploaderId, user.id))
    .where(
      and(
        sql`LOWER(${GuitarTabMetadataTable.artist}) = LOWER(${artist})`,
        sql`LOWER(${GuitarTabMetadataTable.title}) = LOWER(${title})`,
        sql`${GuitarTabMetadataTable.mediaId} != ${excludeMediaId}`,
        eq(GuitarTabMetadataTable.status, "approved"),
      ),
    )
    .orderBy(desc(GuitarTabMetadataTable.createdAt));

  return results as Array<{
    mediaId: number;
    slug: string | null;
    fileName: string;
    trackCount: number;
    tempo: number;
    sizeInBytes: number;
    uploaderName: string | null;
    coverKey: string | null;
  }>;
}

/**
 * 更新 slug
 */
export async function updateSlug(
  db: DB,
  mediaId: number,
  slug: string,
): Promise<void> {
  await db
    .update(GuitarTabMetadataTable)
    .set({ slug, updatedAt: new Date() })
    .where(eq(GuitarTabMetadataTable.mediaId, mediaId));
}

/**
 * 获取所有已通过审核且有 slug 的吉他谱（用于 sitemap）
 */
export async function getAllApprovedSlugs(
  db: DB,
): Promise<Array<{ slug: string; updatedAt: Date }>> {
  const results = await db
    .select({
      slug: GuitarTabMetadataTable.slug,
      updatedAt: GuitarTabMetadataTable.updatedAt,
    })
    .from(GuitarTabMetadataTable)
    .where(
      and(
        eq(GuitarTabMetadataTable.status, "approved"),
        sql`${GuitarTabMetadataTable.slug} IS NOT NULL`,
      ),
    )
    .orderBy(desc(GuitarTabMetadataTable.updatedAt));

  return results as Array<{ slug: string; updatedAt: Date }>;
}

/**
 * 根据 artist + title 查找已有封面的吉他谱（用于封面复用）
 * 通过 case-insensitive 比较找到同一首歌的其他谱子
 */
export async function findExistingCover(
  db: DB,
  artist: string,
  title: string,
  excludeMediaId?: number,
): Promise<{ coverMediaId: number } | null> {
  if (!artist && !title) return null;

  const conditions = [
    sql`LOWER(${GuitarTabMetadataTable.artist}) = LOWER(${artist})`,
    sql`LOWER(${GuitarTabMetadataTable.title}) = LOWER(${title})`,
    sql`${GuitarTabMetadataTable.coverMediaId} IS NOT NULL`,
  ];

  if (excludeMediaId !== undefined) {
    conditions.push(ne(GuitarTabMetadataTable.mediaId, excludeMediaId));
  }

  const [result] = await db
    .select({
      coverMediaId: GuitarTabMetadataTable.coverMediaId,
    })
    .from(GuitarTabMetadataTable)
    .where(and(...conditions))
    .limit(1);

  return result ? { coverMediaId: result.coverMediaId! } : null;
}

/**
 * 获取所有已通过审核的吉他谱 URL 信息（用于 SEO 提交）
 */
export async function getAllApprovedTabUrls(
  db: DB,
): Promise<Array<{ slug: string; title: string | null; artist: string | null; updatedAt: Date }>> {
  const results = await db
    .select({
      slug: GuitarTabMetadataTable.slug,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      updatedAt: GuitarTabMetadataTable.updatedAt,
    })
    .from(GuitarTabMetadataTable)
    .where(
      and(
        eq(GuitarTabMetadataTable.status, "approved"),
        sql`${GuitarTabMetadataTable.slug} IS NOT NULL`,
      ),
    )
    .orderBy(desc(GuitarTabMetadataTable.updatedAt));

  return results as Array<{ slug: string; title: string | null; artist: string | null; updatedAt: Date }>;
}
