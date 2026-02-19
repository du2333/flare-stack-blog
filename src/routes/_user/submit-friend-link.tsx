import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { useFriendLinkSubmitForm } from "@/features/friend-links/hooks/use-friend-link-submit-form";
import { myFriendLinksQuery } from "@/features/friend-links/queries";
import { authClient } from "@/lib/auth/auth.client";

export const Route = createFileRoute("/_user/submit-friend-link")({
  component: SubmitFriendLinkRoute,
  loader: async () => {
    return {
      title: "友情链接",
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
  const { data: myLinks } = useQuery(myFriendLinksQuery());
  const form = useFriendLinkSubmitForm(user?.email);

  if (!user) {
    return null;
  }

  return <theme.SubmitFriendLinkPage myLinks={myLinks ?? []} form={form} />;
}
