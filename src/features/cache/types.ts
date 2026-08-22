export type CacheKey =
  | string
  | ReadonlyArray<string | number | boolean | null | undefined>;

export type PublicCacheReason =
  | "post.published"
  | "post.deleted"
  | "tag.changed"
  | "friend-links.changed"
  | "site-config.changed";

export type PublicCacheReadContext = DbContext & {
  executionCtx: ExecutionContext;
};
