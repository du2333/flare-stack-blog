import { DurableObject } from "cloudflare:workers";
import * as PostService from "@/features/posts/services/posts.service";
import { getDb } from "@/lib/db";

export class PostPublisher extends DurableObject {
  async publish(postId: number) {
    return PostService.publishPost(this.serviceContext(), { id: postId });
  }

  async unpublish(postId: number) {
    return PostService.unpublishPost(this.serviceContext(), { id: postId });
  }

  private serviceContext() {
    return {
      env: this.env,
      db: getDb(this.env),
      executionCtx: this.ctx as unknown as ExecutionContext,
    };
  }
}
