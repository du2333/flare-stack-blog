import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import theme from "@theme";
import { postsInfiniteQueryOptions } from "@/features/posts/queries";
import { getSiteDomainFn } from "@/features/site/site.api";
import { blogConfig } from "@/blog.config";
import { tagsQueryOptions } from "@/features/tags/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";

const { postsPerPage } = theme.config.posts;

export const Route = createFileRoute("/_public/posts")({
  validateSearch: z.object({
    tagName: z.string().optional(),
  }),
  component: RouteComponent,
  pendingComponent: PostsSkeleton,
  loaderDeps: ({ search: { tagName } }) => ({ tagName }),
  loader: async ({ context, deps }) => {
    const [, , domain] = await Promise.all([
      context.queryClient.prefetchInfiniteQuery(
        postsInfiniteQueryOptions({
          tagName: deps.tagName,
          limit: postsPerPage,
        }),
      ),
      context.queryClient.prefetchQuery(tagsQueryOptions),
      getSiteDomainFn(),
    ]);

    return {
      title: "全部文章",
      canonicalHref: buildCanonicalUrl(domain, "/posts", {
        tagName: deps.tagName,
      }),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
      {
        name: "description",
        content: blogConfig.description,
      },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "/posts")],
  }),
});

function RouteComponent() {
  const { tagName } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      postsInfiniteQueryOptions({ tagName, limit: postsPerPage }),
    );

  const posts = useMemo(() => {
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleTagClick = (clickedTag: string) => {
    navigate({
      search: {
        tagName: clickedTag === tagName ? undefined : clickedTag,
      },
      replace: true, // Replace history to avoid back-button clutter
    });
  };

  return (
    <theme.PostsPage
      posts={posts}
      tags={tags}
      selectedTag={tagName}
      onTagClick={handleTagClick}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  );
}

function PostsSkeleton() {
  return <theme.PostsPageSkeleton />;
}
