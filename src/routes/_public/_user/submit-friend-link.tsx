import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SubmitFriendLinkPage } from "@/features/friend-links/components/submit-friend-link-page";
import { useFriendLinkSubmitForm } from "@/features/friend-links/hooks/use-friend-link-submit-form";
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
  const { data: myLinks } = useQuery(myFriendLinksQuery());
  const form = useFriendLinkSubmitForm(user?.email);

  if (!user) {
    return null;
  }

  return <SubmitFriendLinkPage myLinks={myLinks ?? []} form={form} />;
}
