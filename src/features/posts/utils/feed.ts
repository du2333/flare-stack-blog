import { desc, isNotNull, sql } from "drizzle-orm";
import { Feed } from "feed";
import type { SiteConfig } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { publicModifiedAt } from "@/features/posts/public-snapshot";
import { renderFeedHtml } from "@/features/posts/utils/feed-html";
import {
  cdataField,
  finishXml,
  htmlFromText,
  textField,
} from "@/features/posts/utils/feed-xml";
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

export type FeedFlavor = "json" | "rss" | "atom";

/**
 * The feed in one format. A title and a summary are plain text; RSS takes the
 * title as it is and the description as HTML, Atom takes both as HTML, so
 * those are escaped for them. JSON Feed takes plain text as it is. For XML
 * every field also loses what XML 1.0 forbids and has its `]]>` split, which
 * the library does not do (see feed-xml.ts).
 */
export async function createFeed(
  env: Env,
  executionCtx: ExecutionContext,
  flavor: FeedFlavor,
  options: {
    updated: Date | undefined;
    /** Added to the site's title, for a feed of a part of the site. */
    titleSuffix?: string;
    /** The site path the feed describes; the site's home by default. */
    path?: string;
  },
) {
  const xml = flavor !== "json";
  const text = xml ? textField : (value: string) => value;
  const siteConfig = await ConfigService.getSiteConfig({
    env,
    db: getDb(env),
    executionCtx,
  });
  const { DOMAIN } = serverEnv(env);
  const year = new Date().getUTCFullYear();
  const email = getPublicFeedEmail(siteConfig.social);
  const feedAuthor = {
    name: text(siteConfig.author),
    email: email === undefined ? undefined : text(email),
    link: `https://${DOMAIN}/`,
  };
  const address = `https://${DOMAIN}${options.path ?? "/"}`;

  const feed = new Feed({
    updated: options.updated,
    title: text(
      options.titleSuffix === undefined
        ? siteConfig.title
        : `${siteConfig.title} · ${options.titleSuffix}`,
    ),
    description: text(siteConfig.description),
    id: address,
    link: address,
    favicon: `https://${DOMAIN}/favicon.ico`,
    copyright: text(`All rights reserved ${year}, ${siteConfig.author}`),
    generator: text(siteConfig.title),
    author: feedAuthor,
  });

  return { feed, text, feedAuthor, origin: `https://${DOMAIN}` };
}

async function buildFeed(
  env: Env,
  executionCtx: ExecutionContext,
  flavor: FeedFlavor,
) {
  const posts = await getDb(env)
    .select({
      id: PostsTable.id,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
      publicSlug: PostsTable.publicSlug,
    })
    .from(PostsTable)
    .where(isNotNull(PostsTable.publicSnapshotJson))
    .orderBy(
      desc(
        sql`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`,
      ),
    )
    .limit(100);

  // The feed was last updated when its newest change was published, not when
  // it was built and not when a draft was saved.
  const updated = posts.reduce<Date | undefined>((latest, post) => {
    if (!post.publicSnapshotJson) return latest;
    const modifiedAt = publicModifiedAt(post.publicSnapshotJson);
    return !latest || modifiedAt > latest ? modifiedAt : latest;
  }, undefined);

  const { feed, feedAuthor, origin } = await createFeed(
    env,
    executionCtx,
    flavor,
    { updated },
  );

  posts.forEach((post) => {
    const snapshot = post.publicSnapshotJson;
    if (!snapshot) return;
    const summary = snapshot.summary ?? "";
    const html = renderFeedHtml(snapshot.contentJson, origin);
    feed.addItem({
      id: post.id.toString(),
      link: `${origin}/post/${encodeURIComponent(post.publicSlug ?? snapshot.slug)}`,
      ...(flavor === "json"
        ? { title: snapshot.title, description: summary, content: html }
        : {
            title: cdataField(
              flavor === "atom" ? htmlFromText(snapshot.title) : snapshot.title,
            ),
            description: cdataField(htmlFromText(summary)),
            content: cdataField(html),
          }),
      author: [feedAuthor],
      date: publicModifiedAt(snapshot),
      published: new Date(snapshot.publishedAt),
    });
  });

  return feed;
}

export async function buildFeedJson(env: Env, executionCtx: ExecutionContext) {
  return (await buildFeed(env, executionCtx, "json")).json1();
}

export async function buildRssXml(env: Env, executionCtx: ExecutionContext) {
  return finishXml((await buildFeed(env, executionCtx, "rss")).rss2());
}

export async function buildAtomXml(env: Env, executionCtx: ExecutionContext) {
  return finishXml((await buildFeed(env, executionCtx, "atom")).atom1());
}
