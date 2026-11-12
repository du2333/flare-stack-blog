import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

/**
 * Creates a Post and opens it in the editor: the sidebar's compose button,
 * the command palette, the overview and the Posts list all start here.
 */
export function useCreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      void queryClient.invalidateQueries({
        queryKey: orpc.dashboard.overview.key(),
      });
      void navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(post.id) },
      });
    },
    onError: () => toast.error(m.admin_posts_create_failed()),
  });
}
