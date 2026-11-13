import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getAuthClient } from "@/lib/auth/auth-client";
import { getLogoutAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";

export function useLogout({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  const logout = async () => {
    const { error } = await getAuthClient().signOut();
    if (error) {
      toast.error(m.auth_logout_failed(), {
        description:
          getLogoutAuthErrorMessage(error, m) ?? m.auth_logout_failed_desc(),
      });
      return;
    }
    resetAuthBoundQueries(queryClient);
    toast.success(m.auth_logout_success(), {
      description: m.auth_logout_success_desc(),
    });
    onSuccess?.();
  };

  return { logout };
}
