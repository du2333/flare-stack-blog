import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import * as kvStore from "@/features/cache/kv-store";
import { invalidate } from "@/features/cache/public-cache";
import * as PostRepo from "@/features/posts/data/posts.data";
import { POSTS_CACHE_KEYS } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { highlightCodeBlocks } from "@/features/posts/utils/content";
import { calculatePostHash } from "@/features/posts/utils/sync";
import {
  fetchPost,
  invalidatePostCaches,
  upsertPostSearchIndex,
} from "@/features/posts/workflows/helpers";
import * as SearchService from "@/features/search/service/search.service";
import { getDb } from "@/lib/db";

interface Params {
  postId: number;
  isPublished: boolean;
  slug?: string;
}

export class PostProcessWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { postId, isPublished } = event.payload;

    if (isPublished) {
      await this.handlePublish(event, step, postId);
    } else {
      await this.handleUnpublish(event, step, postId);
    }
  }

  private async handlePublish(
    _event: WorkflowEvent<Params>,
    step: WorkflowStep,
    postId: number,
  ) {
    // 1. Fetch post and Check Sync Status
    const { post: initialPost, shouldSkip } = await step.do(
      "check sync status",
      async () => {
        const db = getDb(this.env);
        const p = await PostRepo.findPostById(db, postId);
        if (!p) return { post: null, shouldSkip: true };

        const newHash = await calculatePostHash({
          title: p.title,
          contentJson: p.contentJson,
          summary: p.summary,
          tagIds: p.tags.map((t) => t.id),
          slug: p.slug,
          publishedAt: p.publishedAt,
          pinnedAt: p.pinnedAt,
        });
        const oldHash = await kvStore.get(
          { env: this.env },
          POSTS_CACHE_KEYS.syncHash(postId),
        );
        const needsPublicContentBuild = !p.publicSnapshotJson;

        if (newHash === oldHash && !needsPublicContentBuild) {
          console.log(
            JSON.stringify({ message: "Content unchanged, skipping", postId }),
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

    await step.do("build public content", async () => {
      const db = getDb(this.env);
      const post = await PostRepo.findPostById(db, postId);
      if (!post || !post.publishedAt) return;

      const contentJson = post.contentJson
        ? await highlightCodeBlocks(post.contentJson)
        : null;

      await PostRepo.writePublicSnapshot(db, postId, {
        title: post.title,
        summary: post.summary,
        slug: post.slug,
        contentJson,
        tagIds: [...new Set(post.tags.map((tag) => tag.id))].sort(
          (a, b) => a - b,
        ),
        publishedAt: post.publishedAt.toISOString(),
        pinnedAt: post.pinnedAt ? post.pinnedAt.toISOString() : null,
      });
    });

    await step.do("update search index", async () => {
      return await upsertPostSearchIndex(this.env, updatedPost);
    });

    // 5. Invalidate caches
    await step.do("invalidate caches", async () => {
      await invalidatePostCaches(this.env, updatedPost.slug);
    });

    // 6. Update sync hash in KV
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
        pinnedAt: p.pinnedAt,
      });
      await kvStore.put(
        { env: this.env },
        POSTS_CACHE_KEYS.syncHash(postId),
        hash,
      );
    });
  }

  private async handleUnpublish(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
    postId: number,
  ) {
    const post = await step.do("fetch post", async () => {
      return await fetchPost(this.env, postId);
    });

    if (!post) return;

    await step.do("remove from search index", async () => {
      return await SearchService.deleteIndex({ env: this.env }, { id: postId });
    });

    await step.do("invalidate caches", async () => {
      const slug = event.payload.slug ?? post.slug;
      await invalidate.postDeleted({ env: this.env }, { slug });
      await kvStore.remove(
        { env: this.env },
        POSTS_CACHE_KEYS.syncHash(postId),
      );
    });
  }
}
