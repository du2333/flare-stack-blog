import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { siteConfigQuery, siteDomainQuery } from "@/features/config/queries";
import { PostPage } from "@/features/posts/components/post-page";
import { PostPageSkeleton } from "@/features/posts/components/post-page-skeleton";
import { RELATED_POSTS_LIMIT } from "@/features/posts/components/related-posts";
import { postBySlugQuery, relatedPostsQuery } from "@/features/posts/queries";
import {
  buildArticleJsonLd,
  buildCanonicalUrl,
  canonicalLink,
} from "@/lib/seo";

const searchSchema = z.object({
  comment: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_public/post/$slug")({
  validateSearch: searchSchema,
  component: RouteComponent,
  loader: async ({ context, params }) => {
    // 1. Critical: Main post data - use serverFn (executes directly on server, no HTTP)
    const [post, domain, siteConfig] = await Promise.all([
      context.queryClient.ensureQueryData(postBySlugQuery(params.slug)),
      context.queryClient.ensureQueryData(siteDomainQuery),
      context.queryClient.ensureQueryData(siteConfigQuery),
    ]);

    // 2. Deferred: Related posts (prefetch only, don't await)
    void context.queryClient.prefetchQuery(
      relatedPostsQuery(params.slug, RELATED_POSTS_LIMIT),
    );

    if (!post) throw notFound();

    return {
      post,
      authorName: siteConfig.author,
      canonicalHref: buildCanonicalUrl(
        domain,
        `/post/${encodeURIComponent(post.slug)}`,
      ),
    };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    const canonicalHref = loaderData?.canonicalHref ?? "";
    const coverUrl =
      post?.cover && canonicalHref
        ? new URL(post.cover.url, canonicalHref).toString()
        : undefined;

    return {
      meta: [
        {
          title: post?.title,
        },
        {
          name: "description",
          content: post?.summary ?? "",
        },
        { property: "og:title", content: post?.title ?? "" },
        { property: "og:description", content: post?.summary ?? "" },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonicalHref },
        ...(coverUrl
          ? [
              { property: "og:image", content: coverUrl },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: coverUrl },
            ]
          : []),
      ],
      links: [canonicalLink(canonicalHref)],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: buildArticleJsonLd({
                authorName: loaderData.authorName,
                canonicalHref,
                post: {
                  ...post,
                  image: coverUrl,
                },
              }),
            },
          ]
        : [],
    };
  },
  pendingComponent: () => <PostPageSkeleton />,
  pendingMs: 1000,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug));

  if (!post) throw notFound();

  return <PostPage post={post} />;
}
