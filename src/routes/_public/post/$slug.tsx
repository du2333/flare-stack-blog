import jetbrainsMonoCss from "@fontsource-variable/jetbrains-mono/wght.css?url";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import katexCss from "katex/dist/katex.min.css?url";
import { z } from "zod";
import { NotFound } from "@/components/common/not-found";
import { siteConfigQuery, siteDomainQuery } from "@/features/config/queries";
import { PostPage } from "@/features/posts/components/post-page";
import { PostPageSkeleton } from "@/features/posts/components/post-page-skeleton";
import { adjacentPostsQuery, postBySlugQuery } from "@/features/posts/queries";
import { jsonContentHasType } from "@/features/posts/utils/content";
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
  notFoundComponent: NotFound,
  loader: async ({ context, params }) => {
    const [post, domain, siteConfig] = await Promise.all([
      context.queryClient.ensureQueryData(postBySlugQuery(params.slug)),
      context.queryClient.ensureQueryData(siteDomainQuery),
      context.queryClient.ensureQueryData(siteConfigQuery),
      context.queryClient.ensureQueryData(adjacentPostsQuery(params.slug)),
    ]);

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

    const contentStylesheets: Array<{ rel: "stylesheet"; href: string }> = [];
    if (jsonContentHasType(post?.contentJson, ["inlineMath", "blockMath"])) {
      contentStylesheets.push({ rel: "stylesheet", href: katexCss });
    }
    if (jsonContentHasType(post?.contentJson, "codeBlock")) {
      contentStylesheets.push({ rel: "stylesheet", href: jetbrainsMonoCss });
    }

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
      links: [canonicalLink(canonicalHref), ...contentStylesheets],
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
  pendingMs: 0,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug));

  if (!post) throw notFound();

  return <PostPage post={post} />;
}
