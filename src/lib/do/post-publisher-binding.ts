// See rate-limiter-binding.ts for why `cloudflare:workers` is imported lazily.
export async function getPostPublisher(postId: number) {
  const { exports } = await import("cloudflare:workers");
  return exports.PostPublisher.getByName(`post:${postId}`);
}
