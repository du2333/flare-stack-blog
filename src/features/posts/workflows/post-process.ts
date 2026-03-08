import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import * as CacheService from "@/features/cache/cache.service";
import * as PostService from "@/features/posts/posts.service";
import { POSTS_CACHE_KEYS } from "@/features/posts/posts.schema";
import { getDb } from "@/lib/db";
import * as SearchService from "@/features/search/service/search.service";
import { calculatePostHash } from "@/features/posts/utils/sync";
import {
  fetchPost,
  invalidatePostCaches,
  upsertPostSearchIndex,
} from "@/features/posts/workflows/helpers";

interface Params {
  postId: number;
  isPublished: boolean;
  publishedAt?: string; // ISO 8601
  isFuturePost?: boolean;
}

export class PostProcessWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { postId, isPublished } = event.payload;

    if (isPublished) {
      await this.handlePublish(event, step, postId);
    } else {
      await this.handleUnpublish(step, postId);
    }
  }

  private async handlePublish(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
    postId: number,
  ) {
    // 1. Fetch post and Check Sync Status
    const { post: initialPost, shouldSkip } = await step.do(
      "check sync status",
      async () => {
        const p = await fetchPost(this.env, postId);
        if (!p) return { post: null, shouldSkip: true };

        const newHash = await calculatePostHash({
          title: p.title,
          contentJson: p.contentJson,
          summary: p.summary,
          tagIds: p.tags.map((t) => t.id),
          slug: p.slug,
          publishedAt: p.publishedAt,
          readTimeInMinutes: p.readTimeInMinutes,
        });
        const oldHash = await CacheService.getRaw(
          { env: this.env },
          POSTS_CACHE_KEYS.syncHash(postId),
        );

        if (newHash === oldHash) {
          console.log(
            `[Workflow] Content for post ${postId} unchanged. Skipping.`,
          );
          return { post: p, shouldSkip: true };
        }

        return { post: p, shouldSkip: false };
      },
    );

    if (shouldSkip || !initialPost) return;

    // 2. Generate summary
    const updatedPost = await step.do(
      `generate summary for post ${postId}`,
      {
        retries: {
          limit: 3,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        const db = getDb(this.env);
        const result = await PostService.generateSummaryByPostId({
          context: { db, env: this.env },
          postId,
        });
        if (result.error) {
          return null;
        }
        return result.data;
      },
    );
    if (!updatedPost) return;

    // 3. Update search index (skip for future posts — ScheduledPublishWorkflow handles it)
    const isFuturePost = !!event.payload.isFuturePost;

    if (!isFuturePost) {
      await step.do("update search index", async () => {
        return await upsertPostSearchIndex(this.env, updatedPost);
      });
    }

    // 4. Invalidate caches
    await step.do("invalidate caches", async () => {
      await invalidatePostCaches(this.env, updatedPost.slug);
    });

    // 5. Update sync hash in KV
    await step.do("update sync hash", async () => {
      const p = await fetchPost(this.env, postId);
      if (!p) return;

      const hash = await calculatePostHash({
        title: p.title,
        contentJson: p.contentJson,
        summary: p.summary,
        tagIds: p.tags.map((t) => t.id),
        slug: p.slug,
        publishedAt: p.publishedAt,
        readTimeInMinutes: p.readTimeInMinutes,
      });
      await CacheService.set(
        { env: this.env },
        POSTS_CACHE_KEYS.syncHash(postId),
        hash,
      );
    });
  }

  private async handleUnpublish(step: WorkflowStep, postId: number) {
    const post = await step.do("fetch post", async () => {
      return await fetchPost(this.env, postId);
    });

    if (!post) return;

    await step.do("remove from search index", async () => {
      return await SearchService.deleteIndex({ env: this.env }, { id: postId });
    });

    await step.do("invalidate caches", async () => {
      await invalidatePostCaches(this.env, post.slug);
      await CacheService.deleteKey(
        { env: this.env },
        POSTS_CACHE_KEYS.syncHash(postId),
      );
    });
  }
}
