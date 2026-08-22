import { desc, isNotNull, sql } from "drizzle-orm";
import { Feed } from "feed";
import type { SiteConfig } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { convertToPlainText } from "@/features/posts/utils/content";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server.env";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPublicFeedEmail(social: SiteConfig["social"]) {
  const emailUrl = social.find((link) => link.platform === "email")?.url.trim();

  if (!emailUrl) return undefined;

  const rawAddress = emailUrl
    .replace(/^mailto:/i, "")
    .split("?")[0]
    ?.trim();

  if (!rawAddress) return undefined;

  const address = decodeURIComponent(rawAddress);
  return EMAIL_PATTERN.test(address) ? address : undefined;
}

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
      publicSnapshotJson: PostsTable.publicSnapshotJson,
      publicSlug: PostsTable.publicSlug,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .where(isNotNull(PostsTable.publicSnapshotJson))
    .orderBy(
      desc(
        sql`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`,
      ),
    )
    .limit(100);
  const { DOMAIN } = serverEnv(env);
  const year = new Date().getFullYear();
  const feedAuthor = {
    name: siteConfig.author,
    email: getPublicFeedEmail(siteConfig.social),
    link: `https://${DOMAIN}/`,
  };

  const feed = new Feed({
    title: siteConfig.title,
    description: siteConfig.description,
    id: `https://${DOMAIN}/`,
    link: `https://${DOMAIN}/`,
    favicon: `https://${DOMAIN}/favicon.ico`,
    copyright: `All rights reserved ${year}, ${siteConfig.author}`,
    generator: siteConfig.title,
    author: feedAuthor,
  });

  posts.forEach((post) => {
    const snapshot = post.publicSnapshotJson;
    if (!snapshot) return;
    feed.addItem({
      title: snapshot.title,
      id: post.id.toString(),
      link: `https://${DOMAIN}/post/${encodeURIComponent(post.publicSlug ?? snapshot.slug)}`,
      description: snapshot.summary ?? "",
      content: convertToPlainText(snapshot.contentJson),
      author: [feedAuthor],
      date: new Date(snapshot.publishedAt),
    });
  });

  return feed;
}
