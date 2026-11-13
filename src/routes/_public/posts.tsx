import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { siteConfigQuery, siteDomainQuery } from "@/features/config/queries";
import {
  POSTS_PER_PAGE,
  PostsPage,
} from "@/features/posts/components/posts-page";
import { PostsFilterNotFound } from "@/features/posts/components/posts-filter-not-found";
import { PostsPageSkeleton } from "@/features/posts/components/posts-page-skeleton";
import { categoriesQueryOptions } from "@/features/categories/queries";
import { postsInfiniteQueryOptions } from "@/features/posts/queries";
import {
  findMissingPublicFilter,
  postsPublicSearchSchema,
  resolvePublicName,
  withTagFilter,
} from "@/features/posts/utils/post-public-search";
import { tagsQueryOptions } from "@/features/tags/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/posts")({
  validateSearch: postsPublicSearchSchema,
  component: RouteComponent,
  notFoundComponent: PostsFilterNotFound,
  pendingComponent: PostsSkeleton,
  loaderDeps: ({ search }) => ({
    tagName: search.tagName,
    categoryName: search.categoryName,
    uncategorized: search.uncategorized,
  }),
  loader: async ({ context, deps }) => {
    const [tags, categories, domain, siteConfig] = await Promise.all([
      context.queryClient.ensureQueryData(tagsQueryOptions),
      context.queryClient.ensureQueryData(categoriesQueryOptions),
      context.queryClient.ensureQueryData(siteDomainQuery),
      context.queryClient.ensureQueryData(siteConfigQuery),
    ]);

    // A name is addressed in any case; one that is no Tag or Category of a
    // published post is a page that does not exist, not an empty list. The
    // not-found page names it.
    const tagName = resolvePublicName(
      tags.map((tag) => tag.name),
      deps.tagName,
    );
    const categoryName = deps.uncategorized
      ? undefined
      : resolvePublicName(
          categories.map((category) => category.name),
          deps.categoryName,
        );
    if (tagName === null || categoryName === null) {
      throw notFound({
        data: findMissingPublicFilter({ tagName, categoryName }, deps),
      });
    }

    await context.queryClient.prefetchInfiniteQuery(
      postsInfiniteQueryOptions({
        tagName,
        categoryName,
        uncategorized: deps.uncategorized,
        limit: POSTS_PER_PAGE,
      }),
    );

    return {
      tagName,
      categoryName,
      title: m.posts_title(),
      description: siteConfig.description,
      canonicalHref: buildCanonicalUrl(domain, "/posts", {
        tagName,
        categoryName,
        uncategorized: deps.uncategorized ? "true" : undefined,
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
        content: loaderData?.description,
      },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "/posts")],
  }),
});

function RouteComponent() {
  const search = Route.useSearch();
  const { tagName, categoryName } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      postsInfiniteQueryOptions({
        tagName,
        categoryName,
        uncategorized: search.uncategorized,
        limit: POSTS_PER_PAGE,
      }),
    );

  const posts = useMemo(() => {
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleTagClick = (clickedTag?: string) => {
    void navigate({
      search: withTagFilter(clickedTag),
      replace: true,
    });
  };

  return (
    <PostsPage
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
  return <PostsPageSkeleton />;
}
