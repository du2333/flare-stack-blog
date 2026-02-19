import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { userHasPasswordFn } from "@/features/auth/auth.api";
import {
  useLogout,
  useNotificationToggle,
  usePasswordForm,
  useProfileForm,
} from "@/features/auth/hooks";
import { AUTH_KEYS } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";

export const Route = createFileRoute("/_user/profile")({
  component: ProfilePage,
  loader: async () => {
    return {
      title: "个人资料",
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
  const { data: hasPassword } = useQuery({
    queryKey: AUTH_KEYS.hasPassword(user?.id),
    queryFn: () => userHasPasswordFn(),
    enabled: !!user,
  });
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
