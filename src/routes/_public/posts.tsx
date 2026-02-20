import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import theme from "@theme";
import { postsInfiniteQueryOptions } from "@/features/posts/queries";
import { blogConfig } from "@/blog.config";
import { tagsQueryOptions } from "@/features/tags/queries";

const { postsPerPage } = theme.config.posts;

export const Route = createFileRoute("/_public/posts")({
  validateSearch: z.object({
    tagName: z.string().optional(),
  }),
  component: RouteComponent,
  pendingComponent: PostsSkeleton,
  loaderDeps: ({ search: { tagName } }) => ({ tagName }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.prefetchInfiniteQuery(
        postsInfiniteQueryOptions({
          tagName: deps.tagName,
          limit: postsPerPage,
        }),
      ),
      context.queryClient.prefetchQuery(tagsQueryOptions),
    ]);

    return {
      title: "全部文章",
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
