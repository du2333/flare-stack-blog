// `cloudflare:workers` only resolves inside workerd, so import it lazily to keep
// this module loadable from Bun-run scripts such as `orpc:contract`.
export async function getRateLimiter(name: string) {
  const { exports } = await import("cloudflare:workers");
  return exports.RateLimiter.getByName(name);
}
