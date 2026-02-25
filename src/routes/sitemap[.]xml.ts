import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, lte } from "drizzle-orm";
import { PostsTable } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import * as GuitarTabMetaRepo from "@/features/media/data/guitar-tab-metadata.data";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ context: { env } }) => {
        const db = getDb(env);

        // 获取已发布文章
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

        // 获取已通过审核的吉他谱
        const guitarTabs = await GuitarTabMetaRepo.getAllApprovedSlugs(db);

        // Format date to ISO 8601 (required by sitemap spec)
        const formatDate = (date: Date | null) => {
          if (!date) return new Date().toISOString();
          return new Date(date).toISOString();
        };

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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
    <loc>https://${env.DOMAIN}/guitar-tabs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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
  ${guitarTabs
    .map(
      (tab) => `
  <url>
    <loc>https://${env.DOMAIN}/guitar-tab/${encodeURIComponent(tab.slug)}</loc>
    <lastmod>${formatDate(tab.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`,
    )
    .join("")}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Cache for 1 hour, allow CDN to cache
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
