import { getDb } from "@/lib/db";
import { PageViewsTable } from "@/lib/db/schema";
import type { PageviewMessage } from "@/lib/queue/queue.schema";

export async function handlePageviewMessages(
  context: { env: Env },
  batch: Array<PageviewMessage["data"]>,
) {
  const db = getDb(context.env);
  await db.insert(PageViewsTable).values(
    batch.map((item) => ({
      postId: item.postId,
      visitorHash: item.visitorHash,
    })),
  );
}
