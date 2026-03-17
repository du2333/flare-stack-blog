import { logPostAutoSnapshot } from "@/features/posts/services/post-auto-snapshot.logging";
import type { PostAutoSnapshotMessage } from "@/lib/queue/queue.schema";

function getPostAutoSnapshotWorkflowId(postId: number) {
  return `post-auto-snapshot-${postId}-${Date.now()}`;
}

export async function handlePostAutoSnapshotMessage(
  context: { env: Env },
  data: PostAutoSnapshotMessage["data"],
) {
  const workflowId = getPostAutoSnapshotWorkflowId(data.postId);

  logPostAutoSnapshot(context.env, "queue_message_received", {
    postId: data.postId,
    quietWindowSeconds: data.quietWindowSeconds,
    workflowId,
  });

  const instances = await context.env.POST_AUTO_SNAPSHOT_WORKFLOW.createBatch([
    {
      id: workflowId,
      params: {
        postId: data.postId,
        quietWindowSeconds: data.quietWindowSeconds,
      },
    },
  ]);

  logPostAutoSnapshot(context.env, "workflow_create_batch_completed", {
    postId: data.postId,
    workflowId,
    createdCount: instances.length,
  });
}
