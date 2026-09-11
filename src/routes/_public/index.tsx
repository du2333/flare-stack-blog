import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getHomeBackgroundPreloadImages } from "@/components/layout/preload-images";
import { siteDomainQuery } from "@/features/config/queries";
import {
  HomePage,
  POPULAR_POSTS_LIMIT,
  RECENT_POSTS_LIMIT,
} from "@/features/posts/components/home-page";
import { HomePageSkeleton } from "@/features/posts/components/home-page-skeleton";
import {
  pinnedPostsQuery,
  popularPostsQuery,
  recentPostsQuery,
} from "@/features/posts/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/_public/")({
  loader: async ({ context }) => {
    const [, domain] = await Promise.all([
      context.queryClient.ensureQueryData(recentPostsQuery(RECENT_POSTS_LIMIT)),
      context.queryClient.ensureQueryData(siteDomainQuery),
      context.queryClient.ensureQueryData(pinnedPostsQuery),
      context.queryClient.ensureQueryData(
        popularPostsQuery(POPULAR_POSTS_LIMIT),
      ),
    ]);

    return {
      canonicalHref: buildCanonicalUrl(domain, "/"),
      preloadImages: getHomeBackgroundPreloadImages(context.siteConfig),
    };
  },
  head: ({ loaderData }) => ({
    links: [
      canonicalLink(loaderData?.canonicalHref ?? "/"),
      ...(loaderData?.preloadImages ?? []).map((href) => ({
        rel: "preload" as const,
        as: "image",
        href,
      })),
    ],
  }),
  pendingComponent: HomePageSkeleton,
  component: HomeRoute,
});

function HomeRoute() {
  const { data: posts } = useSuspenseQuery(
    recentPostsQuery(RECENT_POSTS_LIMIT),
  );
  const { data: pinnedPosts } = useSuspenseQuery(pinnedPostsQuery);
  const { data: popularPosts } = useSuspenseQuery(
    popularPostsQuery(POPULAR_POSTS_LIMIT),
  );

  return (
    <HomePage
      posts={posts}
      pinnedPosts={pinnedPosts}
      popularPosts={popularPosts}
    />
  );
}
