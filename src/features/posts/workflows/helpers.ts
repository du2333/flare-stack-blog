import * as CacheService from "@/features/cache/cache.service";
import * as PostService from "@/features/posts/posts.service";
import { POSTS_CACHE_KEYS } from "@/features/posts/posts.schema";
import { TAGS_CACHE_KEYS } from "@/features/tags/tags.schema";
import { getDb } from "@/lib/db";
import { purgePostCDNCache } from "@/lib/invalidate";
import * as SearchService from "@/features/search/service/search.service";

export async function fetchPost(env: Env, postId: number) {
  const db = getDb(env);
  return await PostService.findPostById({ db, env }, { id: postId });
}

export async function invalidatePostCaches(env: Env, slug: string) {
  const version = await CacheService.getVersion({ env }, "posts:detail");
  await Promise.all([
    CacheService.deleteKey({ env }, POSTS_CACHE_KEYS.detail(version, slug)),
    purgePostCDNCache(env, slug),
    CacheService.bumpVersion({ env }, "posts:list"),
    CacheService.deleteKey({ env }, TAGS_CACHE_KEYS.publicList),
  ]);
}

export async function upsertPostSearchIndex(
  env: Env,
  post: {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    contentJson: Parameters<typeof SearchService.upsert>[1]["contentJson"];
    tags: Array<{ name: string }>;
  },
) {
  await SearchService.upsert(
    { env },
    {
      id: post.id,
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      contentJson: post.contentJson,
      tags: post.tags.map((t) => t.name),
    },
  );
}
