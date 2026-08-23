import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@/features/theme/themes/fuwari";
import {
  useLogout,
  useNotificationToggle,
  usePasswordForm,
  useProfileForm,
} from "@/features/auth/hooks";
import { hasPasswordQuery } from "@/features/email/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_user/profile")({
  ssr: false,
  component: ProfilePage,
  loader: async () => {
    return {
      title: m.profile_title(),
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

function ProfilePage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const profileForm = useProfileForm({ user });
  const passwordForm = usePasswordForm();
  const { data: hasPassword } = useQuery(hasPasswordQuery(!!user));
  const notification = useNotificationToggle(user?.id);
  const { logout } = useLogout();

  if (!user) return null;

  return (
    <theme.ProfilePage
      user={user}
      profileForm={profileForm}
      passwordForm={hasPassword ? passwordForm : null}
      notification={notification}
      logout={logout}
    />
  );
}
