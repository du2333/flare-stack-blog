import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProfilePage as ProfileView } from "@/features/auth/components/profile-page";
import {
  useLogout,
  useNotificationToggle,
  useProfileForm,
} from "@/features/auth/hooks";
import { useSession } from "@/features/auth/hooks/use-session";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/_user/profile")({
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
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  const profileForm = useProfileForm({ user });
  const notification = useNotificationToggle(user?.id);
  const { logout } = useLogout({
    onSuccess: () => {
      void navigate({ to: "/" });
    },
  });

  if (!user) return null;

  return (
    <ProfileView
      user={user}
      profileForm={profileForm}
      notification={notification}
      logout={logout}
    />
  );
}
