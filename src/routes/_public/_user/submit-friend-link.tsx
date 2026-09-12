import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SubmitFriendLinkPage } from "@/features/friend-links/components/submit-friend-link-page";
import { myFriendLinksQuery } from "@/features/friend-links/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/_user/submit-friend-link")({
  ssr: false,
  component: SubmitFriendLinkRoute,
  loader: async () => {
    return {
      title: m.friend_link_submit_title(),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function SubmitFriendLinkRoute() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const query = useQuery({ ...myFriendLinksQuery(), refetchOnMount: "always" });

  if (!user) {
    return null;
  }

  return (
    <SubmitFriendLinkPage
      myLinks={query.data ?? []}
      isLoading={query.isPending}
      isError={query.isError && query.data === undefined}
      isRefreshing={query.isFetching}
      reload={() => {
        void query.refetch();
      }}
    />
  );
}
