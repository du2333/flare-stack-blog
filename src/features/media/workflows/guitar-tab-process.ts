import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import * as MediaService from "@/features/media/media.service";

interface Params {
  mediaId: number;
  r2Key: string;
}

/**
 * 吉他谱处理 Workflow
 *
 * 在 GP 文件上传后触发，自动执行：
 * 1. 从 R2 读取 GP 文件 → 解析元数据（标题、艺术家、专辑、速度等）
 * 2. 将元数据保存到 D1 guitar_tab_metadata 表
 * 3. 根据艺术家 + 曲名通过 LrcAPI 获取专辑封面
 * 4. 将封面保存到 R2 和媒体库，关联到吉他谱
 */
export class GuitarTabProcessWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { mediaId, r2Key } = event.payload;

    // Step 1: 解析 GP 文件元数据
    const metadata = await step.do(
      `parse guitar tab metadata (media ${mediaId})`,
      {
        retries: { limit: 2, delay: "3 seconds", backoff: "exponential" },
      },
      async () => {
        const db = getDb(this.env);
        return await MediaService.processGuitarTabMetadata(
          this.env,
          db,
          mediaId,
          r2Key,
        );
      },
    );

    // 如果没有艺术家或标题信息，跳过封面获取
    if (!metadata.artist && !metadata.title) {
      console.log(
        JSON.stringify({
          message: "skipping album cover fetch - no artist/title",
          mediaId,
        }),
      );
      return;
    }

    // Step 2: 获取并保存专辑封面
    await step.do(
      `fetch album cover for "${metadata.title}" by "${metadata.artist}"`,
      {
        retries: { limit: 2, delay: "5 seconds", backoff: "exponential" },
      },
      async () => {
        const db = getDb(this.env);
        await MediaService.fetchAndSaveAlbumCover(
          this.env,
          db,
          mediaId,
          metadata.artist,
          metadata.title,
          metadata.album,
        );
      },
    );
  }
}
