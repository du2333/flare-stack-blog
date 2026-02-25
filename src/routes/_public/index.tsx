import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import {
  featuredPostsQuery,
  publicPostsCountQuery,
} from "@/features/posts/queries";
import { tagsQueryOptions } from "@/features/tags/queries";

const { featuredPostsLimit } = theme.config.home;

export const Route = createFileRoute("/_public/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        featuredPostsQuery(featuredPostsLimit),
      ),
      context.queryClient.ensureQueryData(publicPostsCountQuery),
      context.queryClient.ensureQueryData(tagsQueryOptions),
    ]);
  },
  pendingComponent: HomePageSkeleton,
  component: HomeRoute,
});

function HomeRoute() {
  const { data: posts } = useSuspenseQuery(
    featuredPostsQuery(featuredPostsLimit),
  );
  const { data: totalPosts } = useSuspenseQuery(publicPostsCountQuery);
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  return (
    <theme.HomePage
      posts={posts}
      totalPosts={totalPosts}
      totalTags={tags.length}
    />
  );
}

function HomePageSkeleton() {
  return <theme.HomePageSkeleton />;
}
