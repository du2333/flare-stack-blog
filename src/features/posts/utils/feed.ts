import { and, desc, eq, lte } from "drizzle-orm";
import { Feed } from "feed";
import * as ConfigService from "@/features/config/service/config.service";
import { convertToPlainText } from "@/features/posts/utils/content";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server.env";

export async function buildFeed(env: Env, executionCtx: ExecutionContext) {
  const db = getDb(env);
  const siteConfig = await ConfigService.getSiteConfig({
    env,
    db,
    executionCtx,
  });
  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      contentJson: PostsTable.contentJson,
      slug: PostsTable.slug,
      publishedAt: PostsTable.publishedAt,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .where(
      and(
        eq(PostsTable.status, "published"),
        lte(PostsTable.publishedAt, new Date()),
      ),
    )
    .orderBy(desc(PostsTable.publishedAt))
    .limit(100);
  const { DOMAIN, ADMIN_EMAIL } = serverEnv(env);
  const year = new Date().getFullYear();

  const feed = new Feed({
    title: siteConfig.title,
    description: siteConfig.description,
    id: `https://${DOMAIN}/`,
    link: `https://${DOMAIN}/`,
    favicon: `https://${DOMAIN}/favicon.ico`,
    copyright: `All rights reserved ${year}, ${siteConfig.author}`,
    generator: siteConfig.title,
    author: {
      name: siteConfig.author,
      email: ADMIN_EMAIL,
      link: `https://${DOMAIN}/`,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: post.id.toString(),
      link: `https://${DOMAIN}/post/${encodeURIComponent(post.slug)}`,
      description: post.summary ?? "",
      content: convertToPlainText(post.contentJson),
      author: [
        {
          name: siteConfig.author,
          email: ADMIN_EMAIL,
          link: `https://${DOMAIN}/`,
        },
      ],
      date: post.publishedAt ?? post.updatedAt,
    });
  });

  return feed;
}
