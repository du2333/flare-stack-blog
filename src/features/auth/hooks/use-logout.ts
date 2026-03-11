import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AUTH_KEYS } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";
import { getLogoutAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(m.auth_logout_failed(), {
        description:
          getLogoutAuthErrorMessage(error, m) ?? m.auth_logout_failed_desc(),
      });
      return;
    }
    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
    toast.success(m.auth_logout_success(), {
      description: m.auth_logout_success_desc(),
    });
    navigate({ to: "/" });
  };

  return { logout };
}
