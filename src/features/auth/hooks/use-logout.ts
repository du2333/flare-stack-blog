import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getLogoutAuthErrorMessage } from "@/lib/auth/auth-errors";
import { signOut } from "@/lib/auth/sign-out";
import { m } from "@/paraglide/messages";

export function useLogout({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  const logout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(m.auth_logout_failed(), {
        description:
          getLogoutAuthErrorMessage(error) ?? m.auth_logout_failed_desc(),
      });
      return;
    }
    resetAuthBoundQueries(queryClient, "signed-out");
    toast.success(m.auth_logout_success(), {
      description: m.auth_logout_success_desc(),
    });
    onSuccess?.();
  };

  return { logout };
}
