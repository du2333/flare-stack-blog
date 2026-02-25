import { renderToStaticMarkup } from "react-dom/server";
import type {
  GetMediaListInput,
  UpdateMediaNameInput,
} from "@/features/media/media.schema";
import * as Storage from "@/features/media/data/media.storage";
import * as MediaRepo from "@/features/media/data/media.data";
import * as GuitarTabMetaRepo from "@/features/media/data/guitar-tab-metadata.data";
import * as PostMediaRepo from "@/features/posts/data/post-media.data";
import {
  buildTransformOptions,
  getContentTypeFromKey,
  isAudioFile,
  isGuitarProFile,
  isVideoFile,
} from "@/features/media/media.utils";
import { parseGpHeader } from "@/features/media/utils/gp-header-parser";
import { generateGuitarTabSlug } from "@/features/media/media.utils";
import { CACHE_CONTROL } from "@/lib/constants";
import type { GuitarTabStatus } from "@/lib/db/schema/guitar-tab-metadata.table";
import { GuitarTabReviewEmail } from "@/features/email/templates/GuitarTabReviewEmail";
import { serverEnv } from "@/lib/env/server.env";

/**
 * 公开接口：获取已审核通过的吉他谱文件列表（分页）
 */
export async function getGuitarTabsList(
  context: DbContext,
  data: { page?: number; pageSize?: number; search?: string },
) {
  return await MediaRepo.getGuitarTabsWithMetaPaginated(context.db, data);
}

/**
 * 公开接口：根据 slug 获取吉他谱详情
 */
export async function getGuitarTabBySlug(
  context: DbContext,
  slug: string,
) {
  const tab = await GuitarTabMetaRepo.getBySlug(context.db, slug);
  if (!tab) return null;

  // 获取同首歌的其他版本
  const relatedTabs = await GuitarTabMetaRepo.getRelatedTabs(
    context.db,
    tab.artist,
    tab.title,
    tab.mediaId,
  );

  return { tab, relatedTabs };
}

/**
 * 管理后台：获取吉他谱列表（cursor-based）
 */
export async function getGuitarTabsListAdmin(
  context: DbContext,
  data: { cursor?: number; limit?: number; search?: string; status?: GuitarTabStatus },
) {
  return await MediaRepo.getGuitarTabsWithMeta(context.db, data);
}

/**
 * 管理后台：审核吉他谱（通过/拒绝 + 邮件通知）
 */
export async function reviewGuitarTab(
  context: DbContext & { env: Env },
  data: { mediaId: number; status: "approved" | "rejected"; rejectionReason?: string },
) {
  // 先获取元数据（含上传者信息），用于发邮件
  const tabMeta = await GuitarTabMetaRepo.getByMediaId(context.db, data.mediaId);

  await GuitarTabMetaRepo.updateStatus(context.db, data.mediaId, data.status);

  // 查找上传者邮箱，发送通知邮件
  if (tabMeta?.uploaderId) {
    try {
      const { user: userTable } = await import("@/lib/db/schema/auth.table");
      const { eq } = await import("drizzle-orm");
      const [uploader] = await context.db
        .select({ email: userTable.email, name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, tabMeta.uploaderId))
        .limit(1);

      if (uploader?.email) {
        const { DOMAIN } = serverEnv(context.env);
        const tabTitle = tabMeta.title || "未命名吉他谱";
        const emailHtml = renderToStaticMarkup(
          GuitarTabReviewEmail({
            tabTitle,
            artist: tabMeta.artist ?? undefined,
            approved: data.status === "approved",
            rejectionReason: data.rejectionReason,
            blogUrl: `https://${DOMAIN}`,
          }),
        );

        await context.env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: uploader.email,
            subject: data.status === "approved"
              ? `[吉他谱审核通过] ${tabTitle}`
              : `[吉他谱审核结果] ${tabTitle}`,
            html: emailHtml,
          },
        });
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          message: "guitar tab review email failed",
          mediaId: data.mediaId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}

/**
 * 用户提交吉他谱
 */
export async function submitGuitarTab(
  context: AuthContext & { executionCtx: ExecutionContext },
  input: { file: File },
) {
  const { file } = input;

  // ── 文件哈希去重检查 ──
  const fileBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fileHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const existing = await GuitarTabMetaRepo.findByFileHash(context.db, fileHash);
  if (existing) {
    const displayName = existing.title || existing.fileName;
    throw new Error(`该文件已存在：${displayName}。如果您认为这是不同的版本，请联系管理员。`);
  }

  // 将 ArrayBuffer 重新包装成 File 以便上传（因为上面已经消费了 stream）
  const uploadFile = new File([fileBuffer], file.name, { type: file.type });
  const uploaded = await Storage.putToR2(context.env, uploadFile);

  try {
    const mediaRecord = await MediaRepo.insertMedia(context.db, {
      key: uploaded.key,
      url: uploaded.url,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      sizeInBytes: uploaded.sizeInBytes,
    });

    // 自动解析元数据
    let guitarTabMeta: { title: string; artist: string; album: string } | null = null;
    try {
      const meta = await processGuitarTabMetadata(
        context.env,
        context.db,
        mediaRecord.id,
        uploaded.key,
        context.session.user.id,
        "pending", // 用户提交默认为待审核
        fileHash,
      );
      guitarTabMeta = meta;
      // 后台获取封面
      if (meta.title) {
        context.executionCtx.waitUntil(
          fetchAndSaveAlbumCoverWithTimeout(
            context.env,
            context.db,
            mediaRecord.id,
            meta.artist,
            meta.title,
            meta.album,
          ),
        );
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          message: "user guitar tab processing failed",
          mediaId: mediaRecord.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    return { ...mediaRecord, guitarTabMeta };
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "media db insert failed, rolling back r2 upload",
        key: uploaded.key,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    context.executionCtx.waitUntil(
      Storage.deleteFromR2(context.env, uploaded.key).catch((err) =>
        console.error(
          JSON.stringify({
            message: "r2 rollback delete failed",
            key: uploaded.key,
            error: err instanceof Error ? err.message : String(err),
          }),
        ),
      ),
    );
    throw new Error("Failed to insert media record");
  }
}

/**
 * 获取用户自己提交的吉他谱
 */
export async function getMyGuitarTabs(context: AuthContext) {
  return await GuitarTabMetaRepo.getByUploaderId(context.db, context.session.user.id);
}

export async function upload(
  context: DbContext & { executionCtx: ExecutionContext; session?: Session },
  input: { file: File; width?: number; height?: number },
) {
  const { file, width, height } = input;
  const uploaded = await Storage.putToR2(context.env, file);

  try {
    const mediaRecord = await MediaRepo.insertMedia(context.db, {
      key: uploaded.key,
      url: uploaded.url,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      sizeInBytes: uploaded.sizeInBytes,
      width,
      height,
    });

    // 如果是 Guitar Pro 文件，直接解析元数据（同步等待，确保返回前数据已入库）
    let guitarTabMeta: { title: string; artist: string; album: string } | null = null;
    if (isGuitarProFile(uploaded.key)) {
      try {
        // 管理员上传时，设置 uploaderId 为当前管理员 ID
        const uploaderId = context.session?.user?.id ?? null;
        const meta = await processGuitarTabMetadata(
          context.env,
          context.db,
          mediaRecord.id,
          uploaded.key,
          uploaderId,
          "approved", // 管理员上传直接为已通过
        );
        guitarTabMeta = meta;
        // 封面获取放到后台，前端通过轮询追踪进度
        if (meta.title) {
          context.executionCtx.waitUntil(
            fetchAndSaveAlbumCoverWithTimeout(
              context.env,
              context.db,
              mediaRecord.id,
              meta.artist,
              meta.title,
              meta.album,
            ),
          );
        }
      } catch (err) {
        console.error(
          JSON.stringify({
            message: "auto guitar tab processing failed",
            mediaId: mediaRecord.id,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }

    return { ...mediaRecord, guitarTabMeta };
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "media db insert failed, rolling back r2 upload",
        key: uploaded.key,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    context.executionCtx.waitUntil(
      Storage.deleteFromR2(context.env, uploaded.key).catch((err) =>
        console.error(
          JSON.stringify({
            message: "r2 rollback delete failed",
            key: uploaded.key,
            error: err instanceof Error ? err.message : String(err),
          }),
        ),
      ),
    );
    throw new Error("Failed to insert media record");
  }
}

export async function deleteImage(
  context: DbContext & { executionCtx: ExecutionContext },
  key: string,
) {
  // 后端兜底检查：防止删除正在被引用的媒体
  const inUse = await PostMediaRepo.isMediaInUse(context.db, key);
  if (inUse) {
    throw new Error("Cannot delete media that is in use");
  }

  // 如果是吉他谱文件，同步删除关联的封面
  if (isGuitarProFile(key)) {
    const media = await MediaRepo.getMediaByKey(context.db, key);
    if (media) {
      const meta = await GuitarTabMetaRepo.getByMediaId(context.db, media.id);
      if (meta?.coverMediaId) {
        // 查找封面的 key 以便从 R2 删除
        const coverMeta = await GuitarTabMetaRepo.getByMediaIdWithCover(
          context.db,
          media.id,
        );
        if (coverMeta?.coverKey) {
          // 删除封面 media 记录和 R2 对象
          await MediaRepo.deleteMedia(context.db, coverMeta.coverKey);
          context.executionCtx.waitUntil(
            Storage.deleteFromR2(context.env, coverMeta.coverKey).catch(
              (err) =>
                console.error(
                  JSON.stringify({
                    message: "r2 cover delete failed",
                    key: coverMeta.coverKey,
                    error:
                      err instanceof Error ? err.message : String(err),
                  }),
                ),
            ),
          );
          console.log(
            JSON.stringify({
              message: "guitar tab cover deleted",
              gpKey: key,
              coverKey: coverMeta.coverKey,
            }),
          );
        }
      }
      // 删除吉他谱元数据
      await GuitarTabMetaRepo.deleteByMediaId(context.db, media.id);
    }
  }

  await MediaRepo.deleteMedia(context.db, key);
  context.executionCtx.waitUntil(
    Storage.deleteFromR2(context.env, key).catch((err) =>
      console.error(
        JSON.stringify({
          message: "r2 delete failed",
          key,
          error: err instanceof Error ? err.message : String(err),
        }),
      ),
    ),
  );
}

export async function getMediaList(
  context: DbContext,
  data: GetMediaListInput,
) {
  return await MediaRepo.getMediaList(context.db, data);
}

export async function isMediaInUse(context: DbContext, key: string) {
  return await PostMediaRepo.isMediaInUse(context.db, key);
}

export async function getLinkedPosts(context: DbContext, key: string) {
  return await PostMediaRepo.getPostsByMediaKey(context.db, key);
}

export async function getLinkedMediaKeys(
  context: DbContext,
  keys: Array<string>,
) {
  return await PostMediaRepo.getLinkedMediaKeys(context.db, keys);
}

export async function getTotalMediaSize(context: DbContext) {
  return await MediaRepo.getTotalMediaSize(context.db);
}

export async function updateMediaName(
  context: DbContext,
  data: UpdateMediaNameInput,
) {
  return await MediaRepo.updateMediaName(context.db, data.key, data.name);
}

export async function handleImageRequest(
  env: Env,
  key: string,
  request: Request,
) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const serveOriginal = async () => {
    const object = await env.R2.get(key);
    if (!object) {
      return new Response("Image not found", { status: 404 });
    }

    const contentType =
      object.httpMetadata?.contentType ||
      getContentTypeFromKey(key) ||
      "application/octet-stream";

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", contentType);
    headers.set("ETag", object.httpEtag);

    return new Response(object.body, { headers });
  };

  // 1. 防止循环调用 & 显式请求原图
  const viaHeader = request.headers.get("via");
  const isLoop = viaHeader && /image-resizing/.test(viaHeader);
  const wantsOriginal = searchParams.get("original") === "true";

  // Guitar Pro / 视频 / 音频等非图片文件直接返回原文件
  if (isLoop || wantsOriginal || isGuitarProFile(key) || isVideoFile(key) || isAudioFile(key)) {
    return await serveOriginal();
  }

  // 2. 构建 Cloudflare Image Resizing 参数
  const transformOptions = buildTransformOptions(
    searchParams,
    request.headers.get("Accept") || "",
  );

  // 3. 尝试进行图片处理
  try {
    const origin = url.origin;
    const sourceImageUrl = `${origin}/images/${key}?original=true`;

    const subRequestHeaders = new Headers();

    const headersToKeep = ["user-agent", "accept"];
    for (const [k, v] of request.headers.entries()) {
      if (headersToKeep.includes(k.toLowerCase())) {
        subRequestHeaders.set(k, v);
      }
    }

    const imageRequest = new Request(sourceImageUrl, {
      headers: subRequestHeaders,
    });

    // 调用 Cloudflare Images 变换
    const response = await fetch(imageRequest, {
      cf: { image: transformOptions },
    });

    // 如果变换失败 (如格式不支持)，降级回原图
    if (!response.ok) {
      console.error(
        JSON.stringify({
          message: "image transform failed",
          key,
          status: response.status,
          statusText: response.statusText,
        }),
      );
      return await serveOriginal();
    }

    // 4. 返回处理后的图片
    // 使用 new Response(response.body, response) 保持状态码和其它优化头信息
    const newResponse = new Response(response.body, response);

    // 覆盖/补充必要的缓存头
    newResponse.headers.set("Vary", "Accept");
    Object.entries(CACHE_CONTROL.immutable).forEach(([k, v]) => {
      newResponse.headers.set(k, v);
    });

    return newResponse;
  } catch (e) {
    console.error(
      JSON.stringify({
        message: "image transform error",
        key,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return await serveOriginal();
  }
}

// ── 吉他谱元数据处理 ─────────────────────────────────

/**
 * 从 R2 读取 GP 文件并解析元数据，保存到 D1
 */
export async function processGuitarTabMetadata(
  env: Env,
  db: DB,
  mediaId: number,
  r2Key: string,
  uploaderId?: string | null,
  status?: GuitarTabStatus,
  fileHash?: string,
): Promise<{
  title: string;
  artist: string;
  album: string;
}> {
  // 从 R2 获取文件
  const object = await env.R2.get(r2Key);
  if (!object) {
    throw new Error(`R2 object not found: ${r2Key}`);
  }

  const buffer = await object.arrayBuffer();
  const data = new Uint8Array(buffer);

  // 解析 GP 头信息（异步：GPX 格式需要解压 BCFZ 容器）
  const info = await parseGpHeader(data);

  // 保存到数据库
  await GuitarTabMetaRepo.upsertMetadata(db, {
    mediaId,
    title: info.title,
    artist: info.artist,
    album: info.album,
    tempo: info.tempo,
    trackCount: info.trackCount,
    trackNames: JSON.stringify(info.trackNames),
    ...(uploaderId !== undefined ? { uploaderId } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(fileHash ? { fileHash } : {}),
  });

  // 生成并保存 slug（用于详情页 URL）
  const slug = generateGuitarTabSlug(info.artist, info.title);
  try {
    await GuitarTabMetaRepo.updateSlug(db, mediaId, slug);
  } catch {
    // slug 冲突时重试一次
    const retrySlug = generateGuitarTabSlug(info.artist, info.title);
    await GuitarTabMetaRepo.updateSlug(db, mediaId, retrySlug).catch(() => {
      console.error(JSON.stringify({ message: "slug generation failed", mediaId }));
    });
  }

  console.log(
    JSON.stringify({
      message: "guitar tab metadata saved",
      mediaId,
      title: info.title,
      artist: info.artist,
    }),
  );

  return {
    title: info.title,
    artist: info.artist,
    album: info.album,
  };
}

/**
 * 通过 LrcAPI (api.lrc.cx/cover) 获取专辑封面
 * 保存到 R2 和媒体库，关联到吉他谱元数据
 * 会先检查是否已有相同 artist+title 的封面，如果有则直接复用
 *
 * @see https://docs.lrc.cx/docs/legacy/cover
 */
export async function fetchAndSaveAlbumCover(
  env: Env,
  db: DB,
  mediaId: number,
  artist: string,
  title: string,
  album?: string,
): Promise<boolean> {
  if (!artist && !title) return false;

  try {
    // ── 封面复用：检查是否已有相同 artist+title 的封面 ──
    const existingCover = await GuitarTabMetaRepo.findExistingCover(db, artist, title, mediaId);
    if (existingCover) {
      await GuitarTabMetaRepo.updateCoverMediaId(db, mediaId, existingCover.coverMediaId);
      console.log(
        JSON.stringify({
          message: "album cover reused from existing tab",
          mediaId,
          coverMediaId: existingCover.coverMediaId,
          artist,
          title,
        }),
      );
      return true;
    }

    // ── 从 LrcAPI 下载新封面 ──
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (artist) params.set("artist", artist);
    if (album) params.set("album", album);

    const coverResponse = await fetch(
      `https://api.lrc.cx/cover?${params.toString()}`,
      { redirect: "follow" },
    );

    if (!coverResponse.ok) {
      console.log(
        JSON.stringify({
          message: "lrcapi cover not found",
          status: coverResponse.status,
          artist,
          title,
        }),
      );
      return false;
    }

    const coverContentType =
      coverResponse.headers.get("content-type") || "image/jpeg";

    // 确认返回的是图片
    if (!coverContentType.startsWith("image/")) {
      console.log(
        JSON.stringify({
          message: "lrcapi returned non-image content",
          contentType: coverContentType,
          artist,
          title,
        }),
      );
      return false;
    }

    const coverBuffer = await coverResponse.arrayBuffer();
    if (coverBuffer.byteLength < 1000) {
      // 过小的响应可能是错误占位图
      console.log(
        JSON.stringify({
          message: "lrcapi cover too small, skipping",
          size: coverBuffer.byteLength,
          artist,
          title,
        }),
      );
      return false;
    }

    const coverExt = coverContentType.includes("png") ? "png" : "jpg";

    // 保存到 R2
    const coverKey = `album-covers/${crypto.randomUUID()}.${coverExt}`;
    await env.R2.put(coverKey, coverBuffer, {
      httpMetadata: { contentType: coverContentType },
      customMetadata: {
        artist,
        title,
        source: "lrcapi",
      },
    });

    // 插入 media 记录
    const coverMedia = await MediaRepo.insertMedia(db, {
      key: coverKey,
      url: `/images/${coverKey}`,
      fileName: `${artist} - ${title}.${coverExt}`,
      mimeType: coverContentType,
      sizeInBytes: coverBuffer.byteLength,
    });

    // 关联到吉他谱元数据
    await GuitarTabMetaRepo.updateCoverMediaId(db, mediaId, coverMedia.id);

    console.log(
      JSON.stringify({
        message: "album cover saved",
        mediaId,
        coverKey,
        artist,
        title,
        source: "lrcapi",
      }),
    );

    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "album cover fetch failed",
        mediaId,
        artist,
        title,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

/** 带超时的封面获取包装，用于 waitUntil 后台执行 */
async function fetchAndSaveAlbumCoverWithTimeout(
  env: Env,
  db: DB,
  mediaId: number,
  artist: string,
  title: string,
  album?: string,
): Promise<void> {
  const COVER_FETCH_TIMEOUT = 15_000; // 15 秒超时

  try {
    const result = await Promise.race([
      fetchAndSaveAlbumCover(env, db, mediaId, artist, title, album),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("cover fetch timeout")),
          COVER_FETCH_TIMEOUT,
        ),
      ),
    ]);

    if (!result) {
      console.log(
        JSON.stringify({
          message: "cover not found or too small",
          mediaId,
          artist,
          title,
        }),
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "cover fetch with timeout failed",
        mediaId,
        artist,
        title,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

/**
 * 根据 media ID 获取吉他谱元数据（含封面 key）
 */
export async function getGuitarTabMetaByMediaId(
  context: DbContext,
  mediaId: number,
) {
  return await GuitarTabMetaRepo.getByMediaIdWithCover(context.db, mediaId);
}

/**
 * 获取未处理的吉他谱列表
 */
export async function getUnprocessedGuitarTabs(context: DbContext) {
  return await GuitarTabMetaRepo.getUnprocessedGuitarTabs(context.db);
}

/**
 * 直接处理吉他谱（不依赖 Workflow）
 * 解析元数据 + 获取封面
 *
 * @param force 强制重新解析所有吉他谱（覆盖已有元数据）
 */
export async function processAllGuitarTabsDirect(
  env: Env,
  db: DB,
  force = false,
): Promise<{ processed: number; covers: number; errors: number }> {
  const items = force
    ? await GuitarTabMetaRepo.getAllGuitarProMedia(db)
    : await GuitarTabMetaRepo.getUnprocessedGuitarTabs(db);
  let processed = 0;
  let covers = 0;
  let errors = 0;

  for (const item of items) {
    try {
      // Step 1: 解析元数据
      const metadata = await processGuitarTabMetadata(
        env,
        db,
        item.id,
        item.key,
      );
      processed++;

      // Step 2: 获取封面
      if (metadata.artist || metadata.title) {
        const saved = await fetchAndSaveAlbumCover(
          env,
          db,
          item.id,
          metadata.artist,
          metadata.title,
          metadata.album,
        );
        if (saved) covers++;
      }
    } catch (err) {
      errors++;
      console.error(
        JSON.stringify({
          message: "direct guitar tab processing failed",
          mediaId: item.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  return { processed, covers, errors };
}

/**
 * 为已有元数据但没有封面的吉他谱获取封面
 */
export async function fetchMissingCovers(
  env: Env,
  db: DB,
): Promise<{ total: number; fetched: number; errors: number }> {
  const tabs = await GuitarTabMetaRepo.getTabsWithoutCover(db);
  let fetched = 0;
  let errors = 0;

  for (const tab of tabs) {
    try {
      const saved = await fetchAndSaveAlbumCover(
        env,
        db,
        tab.mediaId,
        tab.artist ?? "",
        tab.title ?? "",
        tab.album ?? undefined,
      );
      if (saved) fetched++;
    } catch (err) {
      errors++;
      console.error(
        JSON.stringify({
          message: "missing cover fetch failed",
          mediaId: tab.mediaId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  return { total: tabs.length, fetched, errors };
}

