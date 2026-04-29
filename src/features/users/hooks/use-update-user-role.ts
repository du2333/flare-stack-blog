import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateUserRoleFn } from "../api/users.admin.api";
import { USERS_KEYS } from "../queries";
import type { UpdateUserRoleInput } from "../users.schema";
import { m } from "@/paraglide/messages";

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: UpdateUserRoleInput) =>
      updateUserRoleFn({ data: input }),
    onSuccess: (result) => {
      if ("error" in result && result.error) {
        const reason = (result.error as { reason: string }).reason;
        switch (reason) {
          case "USER_NOT_FOUND":
            toast.error(m.admin_users_toast_not_found());
            return;
          case "CANNOT_MODIFY_SUPERADMIN":
            toast.error(m.admin_users_toast_cannot_modify_superadmin());
            return;
          default:
            return;
        }
      }
      toast.success(m.admin_users_toast_role_updated());
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists });
    },
  });

  return {
    updateRole: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
