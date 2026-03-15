import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS } from "@/features/posts/post-auto-snapshot.service";
import * as PostRevisionService from "@/features/posts/post-revisions.service";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";
import { ms } from "@/lib/duration";

interface Params {
  postId: number;
  quietWindowSeconds?: number;
}

export class PostAutoSnapshotWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const quietWindowSeconds = Math.max(
      5,
      event.payload.quietWindowSeconds ??
        DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS,
    );

    await this.waitForQuietWindow(
      step,
      event.payload.postId,
      quietWindowSeconds,
    );

    await step.do("create auto snapshot revision", async () => {
      const db = getDb(this.env);
      const result = await PostRevisionService.createPostRevision(
        { db, env: this.env },
        {
          postId: event.payload.postId,
          reason: "auto",
        },
      );

      if (result.error) return { created: false }

      return result.data;
    });
  }

  private async waitForQuietWindow(
    step: WorkflowStep,
    postId: number,
    quietWindowSeconds: number,
  ) {
    const quietWindowMs = ms(`${quietWindowSeconds}s`);

    while (true) {
      await step.sleep(
        "wait for editor quiet window",
        `${quietWindowSeconds} seconds`,
      );

      const updatedAt = await step.do(
        "read latest post update time",
        async () => {
          const db = getDb(this.env);
          const post = await db.query.PostsTable.findFirst({
            where: eq(PostsTable.id, postId),
            columns: {
              updatedAt: true,
            },
          });
          return post?.updatedAt ?? null;
        },
      );

      if (!updatedAt) {
        return;
      }

      const msSinceLastUpdate = Date.now() - updatedAt.getTime();
      if (msSinceLastUpdate >= quietWindowMs) {
        return;
      }

      const remainingMs = quietWindowMs - msSinceLastUpdate;
      await step.sleep("wait for additional quiet time", remainingMs);
    }
  }
}
