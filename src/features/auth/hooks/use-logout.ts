import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { resetAuthBoundQueries } from "@/features/auth/queries";
import { getLogoutAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";

export function useLogout({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  const logout = async () => {
    const failed = (description: string = m.auth_logout_failed_desc()) =>
      toast.error(m.auth_logout_failed(), { description });
    // Every public page offers sign-out; Better Auth's client loads only
    // when someone uses it.
    let client;
    try {
      client = (await import("@/lib/auth/auth-client")).getAuthClient();
    } catch {
      failed();
      return;
    }
    const { error } = await client.signOut();
    if (error) {
      failed(getLogoutAuthErrorMessage(error) ?? undefined);
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
