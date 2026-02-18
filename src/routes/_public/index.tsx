import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { featuredPostsQuery } from "@/features/posts/queries";

export const Route = createFileRoute("/_public/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(featuredPostsQuery);
  },
  pendingComponent: HomePageSkeleton,
  component: HomeRoute,
});

function HomeRoute() {
  const { data: posts } = useSuspenseQuery(featuredPostsQuery);
  return <theme.HomePage posts={posts} />;
}

function HomePageSkeleton() {
  return <theme.HomePageSkeleton />;
}
