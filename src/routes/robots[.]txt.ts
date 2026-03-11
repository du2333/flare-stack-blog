import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ context: { env } }) => {
        const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /search
Disallow: /unsubscribe
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /verify-email
Disallow: /reset-link
Disallow: /profile
Disallow: /submit-friend-link
Sitemap: https://${env.DOMAIN}/sitemap.xml`;

        return new Response(robots, {
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
      HEAD: async () => {
        return new Response(null, {
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
    },
  },
});
