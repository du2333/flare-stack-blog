import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ context: { env } }) => {
        const db = getDb(env);
        // Only fetch published posts that are publicly viewable
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

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Cache for 1 hour, allow CDN to cache
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
      HEAD: async () => {
        return new Response(null, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
