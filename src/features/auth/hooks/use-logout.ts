import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AUTH_KEYS } from "@/features/auth/queries";
import { authClient } from "@/lib/auth/auth.client";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("退出失败, 请稍后重试。", { description: error.message });
      return;
    }
    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
    toast.success("已退出登录", { description: "期待再次相见。" });
    navigate({ to: "/" });
  };

  return { logout };
}
