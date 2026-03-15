import type { PostAutoSnapshotMessage } from "@/lib/queue/queue.schema";

export async function handlePostAutoSnapshotMessage(
  context: { env: Env },
  data: PostAutoSnapshotMessage["data"],
) {
  await context.env.POST_AUTO_SNAPSHOT_WORKFLOW.createBatch([
    {
      id: `post-auto-snapshot:${data.postId}`,
      params: {
        postId: data.postId,
        quietWindowSeconds: data.quietWindowSeconds,
      },
    },
  ]);
}
