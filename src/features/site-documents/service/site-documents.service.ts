import * as ConfigService from "@/features/config/service/config.service";
import * as MomentRepo from "@/features/moments/data/moments.data";
import {
  getPublishedPostsForSitemapBatch,
  type SitemapPostRow,
} from "@/features/posts/data/posts.data";
import { getDb } from "@/lib/db";
import { serverEnv } from "@/lib/env/server.env";

export const SITE_DOCUMENT_CACHE_CONTROL = {
  feed: "public, max-age=3600, s-maxage=3600",
  manifest: "public, max-age=3600, s-maxage=3600",
  robots: "public, max-age=86400, s-maxage=86400",
  sitemap: "public, max-age=3600, s-maxage=3600",
} as const;

function buildManifest(
  site: Awaited<ReturnType<typeof ConfigService.getSiteConfig>>,
) {
  return {
    name: site.title,
    short_name: site.title,
    icons: [
      {
        src: site.icons.webApp192,
        sizes: "192x192",
      },
      {
        src: site.icons.webApp512,
        sizes: "512x512",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
}

// The feed library (feed, xml-js, sax) is only for the three feed documents,
// so the route tree that imports this module doesn't evaluate it.
const loadFeeds = () => import("@/features/posts/utils/feed");

export async function buildFeedJson(env: Env, executionCtx: ExecutionContext) {
  const Feeds = await loadFeeds();
  return Feeds.buildFeedJson(env, executionCtx);
}

export async function buildRssXml(env: Env, executionCtx: ExecutionContext) {
  const Feeds = await loadFeeds();
  return Feeds.buildRssXml(env, executionCtx);
}

export async function buildAtomXml(env: Env, executionCtx: ExecutionContext) {
  const Feeds = await loadFeeds();
  return Feeds.buildAtomXml(env, executionCtx);
}

const loadMomentFeeds = () => import("@/features/moments/utils/feed");

export async function buildMomentsFeedJson(
  env: Env,
  executionCtx: ExecutionContext,
) {
  const Feeds = await loadMomentFeeds();
  return Feeds.buildMomentsFeedJson(env, executionCtx);
}

export async function buildMomentsRssXml(
  env: Env,
  executionCtx: ExecutionContext,
) {
  const Feeds = await loadMomentFeeds();
  return Feeds.buildMomentsRssXml(env, executionCtx);
}

export async function buildMomentsAtomXml(
  env: Env,
  executionCtx: ExecutionContext,
) {
  const Feeds = await loadMomentFeeds();
  return Feeds.buildMomentsAtomXml(env, executionCtx);
}

const SITEMAP_BATCH_SIZE = 500;

async function getAllMomentsForSitemap(env: Env) {
  const db = getDb(env);
  const moments: Array<{ id: number; updatedAt: Date }> = [];

  let cursor: number | undefined;
  while (true) {
    const batch = await MomentRepo.findMomentsForSitemapBatch(db, {
      cursor,
      limit: SITEMAP_BATCH_SIZE,
    });
    moments.push(...batch);
    if (batch.length < SITEMAP_BATCH_SIZE) break;
    cursor = batch[batch.length - 1].id;
  }

  return moments;
}

async function getAllPublishedPostsForSitemap(env: Env) {
  const db = getDb(env);
  const posts: Array<SitemapPostRow> = [];

  let cursor: {
    publishedAt: Date;
    id: number;
  } | null = null;

  while (true) {
    const batch = await getPublishedPostsForSitemapBatch(db, {
      cursor: cursor ?? undefined,
      limit: SITEMAP_BATCH_SIZE,
    });

    if (batch.length === 0) {
      break;
    }

    posts.push(...batch);

    const lastPost = batch[batch.length - 1];
    if (!lastPost?.publishedAt) {
      break;
    }

    cursor = {
      publishedAt: lastPost.publishedAt,
      id: lastPost.id,
    };

    if (batch.length < SITEMAP_BATCH_SIZE) {
      break;
    }
  }

  return posts;
}

export async function buildSitemapXml(env: Env) {
  const { DOMAIN } = serverEnv(env);
  const posts = await getAllPublishedPostsForSitemap(env);
  const moments = await getAllMomentsForSitemap(env);

  const formatDate = (
    primaryDate: Date | null,
    fallbacks: Array<Date | null> = [],
  ) => {
    const date = [primaryDate, ...fallbacks].find((value) => value != null);
    if (!date) return null;
    return new Date(date).toISOString();
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}/posts</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}/friend-links</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>${
    // The page is not there to readers until a Moment exists.
    moments.length > 0
      ? `
  <url>
    <loc>https://${DOMAIN}/moments</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
      : ""
  }
  ${posts
    .map((post) => {
      // The draft's updatedAt would show edits that are not published.
      const lastModifiedAt = formatDate(post.lastPublishedAt, [
        post.publishedAt,
      ]);

      return `
  <url>
    <loc>https://${DOMAIN}/post/${encodeURIComponent(post.slug)}</loc>
    ${lastModifiedAt ? `<lastmod>${lastModifiedAt}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("")}${moments
    .map(
      (moment) => `
  <url>
    <loc>https://${DOMAIN}/moments/${moment.id}</loc>
    <lastmod>${moment.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`,
    )
    .join("")}
</urlset>`;
}

export function buildRobotsTxt(env: Env) {
  const { DOMAIN } = serverEnv(env);
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /search
Disallow: /unsubscribe
Disallow: /login
Disallow: /profile
Disallow: /submit-friend-link
Sitemap: https://${DOMAIN}/sitemap.xml`;
}

export async function buildWebManifest(
  env: Env,
  executionCtx: ExecutionContext,
) {
  const site = await ConfigService.getSiteConfig({
    env,
    db: getDb(env),
    executionCtx,
  });

  return JSON.stringify(buildManifest(site), null, 2);
}
