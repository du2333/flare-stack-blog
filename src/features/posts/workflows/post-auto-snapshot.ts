import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { logPostAutoSnapshot } from "@/features/posts/services/post-auto-snapshot.logging";
import { DEFAULT_AUTO_SNAPSHOT_QUIET_WINDOW_SECONDS } from "@/features/posts/services/post-auto-snapshot.service";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
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

    logPostAutoSnapshot(this.env, "workflow_started", {
      postId: event.payload.postId,
      quietWindowSeconds,
      workflowInstanceId: event.instanceId,
    });

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

      if (result.error) {
        logPostAutoSnapshot(this.env, "workflow_create_revision_failed", {
          postId: event.payload.postId,
          workflowInstanceId: event.instanceId,
          reason: result.error.reason,
        });
        return { created: false };
      }

      logPostAutoSnapshot(this.env, "workflow_create_revision_completed", {
        postId: event.payload.postId,
        workflowInstanceId: event.instanceId,
        created: result.data.created,
        skipReason: result.data.skipReason ?? null,
        revisionId: result.data.revision?.id ?? null,
      });

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
      logPostAutoSnapshot(this.env, "workflow_waiting_for_quiet_window", {
        postId,
        quietWindowSeconds,
      });

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
        logPostAutoSnapshot(this.env, "workflow_post_missing_during_wait", {
          postId,
        });
        return;
      }

      const nowMs = Date.now();
      const updatedAtMs = updatedAt.getTime();
      const msSinceLastUpdate = nowMs - updatedAtMs;
      if (msSinceLastUpdate >= quietWindowMs) {
        logPostAutoSnapshot(this.env, "workflow_quiet_window_satisfied", {
          postId,
          quietWindowSeconds,
          quietWindowMs,
          nowMs,
          updatedAtIso: updatedAt.toISOString(),
          updatedAtMs,
          msSinceLastUpdate,
        });
        return;
      }

      const remainingMs = quietWindowMs - msSinceLastUpdate;
      logPostAutoSnapshot(this.env, "workflow_quiet_window_extended", {
        postId,
        quietWindowSeconds,
        quietWindowMs,
        nowMs,
        updatedAtIso: updatedAt.toISOString(),
        updatedAtMs,
        msSinceLastUpdate,
        remainingMs,
      });
      await step.sleep("wait for additional quiet time", remainingMs);
    }
  }
}
