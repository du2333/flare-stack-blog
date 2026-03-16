import { and, desc, eq, lte } from "drizzle-orm";
import * as ConfigService from "@/features/config/service/config.service";
import { buildFeed } from "@/features/posts/utils/feed";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";

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

export async function buildFeedJson(env: Env, executionCtx: ExecutionContext) {
  const feed = await buildFeed(env, executionCtx);
  return feed.json1();
}

export async function buildRssXml(env: Env, executionCtx: ExecutionContext) {
  const feed = await buildFeed(env, executionCtx);
  return feed.rss2();
}

export async function buildAtomXml(env: Env, executionCtx: ExecutionContext) {
  const feed = await buildFeed(env, executionCtx);
  return feed.atom1();
}

export async function buildSitemapXml(env: Env) {
  const db = getDb(env);
  const posts = await db
    .select({
      slug: PostsTable.slug,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .where(
      and(
        eq(PostsTable.status, "published"),
        lte(PostsTable.publishedAt, new Date()),
      ),
    )
    .orderBy(desc(PostsTable.updatedAt))
    .limit(100);

  const formatDate = (date: Date | null) => {
    if (!date) return new Date().toISOString();
    return new Date(date).toISOString();
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${env.DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${env.DOMAIN}/posts</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${env.DOMAIN}/friend-links</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ${posts
    .map(
      (post) => `
  <url>
    <loc>https://${env.DOMAIN}/post/${encodeURIComponent(post.slug)}</loc>
    <lastmod>${formatDate(post.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    )
    .join("")}
</urlset>`;
}

export function buildRobotsTxt(env: Env) {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /search
Disallow: /unsubscribe
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /verify-email
Disallow: /reset-link
Disallow: /oauth/consent
Disallow: /profile
Disallow: /submit-friend-link
Sitemap: https://${env.DOMAIN}/sitemap.xml`;
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
