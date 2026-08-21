import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "@/features/posts/components/post-editor";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import type { PostEditorData } from "@/features/posts/components/post-editor/types";
import { postByIdQuery } from "@/features/posts/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import {
  tagsAdminQueryOptions,
  tagsByPostIdQueryOptions,
} from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts/edit/$id")({
  ssr: "data-only",
  component: EditPost,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const [post, _] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      context.queryClient.ensureQueryData(tagsByPostIdQueryOptions(postId)),
      // Prefetch all tags for the selector
      context.queryClient.prefetchQuery(tagsAdminQueryOptions()),
    ]);
    return { title: post?.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function EditPost() {
  const { id } = Route.useParams();
  const postId = Number(id);
  const queryClient = useQueryClient();

  // Use useQuery instead of useSuspenseQuery to prevent flickering on background refetches
  // Since loader ensures data is in cache, these will have initial data immediately.
  const { data: post } = useQuery(postByIdQuery(postId));
  const { data: tags } = useQuery(tagsByPostIdQueryOptions(postId));

  if (!post || !tags) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif font-medium">
            {m.admin_post_edit_not_found_title()}
          </h2>
          <p className="text-zinc-400 font-light text-sm">
            {m.admin_post_edit_not_found_desc({ id: String(postId) })}
          </p>
        </div>
      </div>
    );
  }

  const initialData = {
    id: post.id,
    title: post.title,
    summary: post.summary ?? "",
    slug: post.slug,
    status: post.status,
    readTimeInMinutes: post.readTimeInMinutes,
    contentJson: post.contentJson,
    publishedAt: post.publishedAt,
    tagIds: tags.map((t) => t.id),
    pinnedAt: post.pinnedAt,
    isSynced: post.isSynced,
    hasPublicCache: post.hasPublicCache,
  };

  const handleSave = async (data: PostEditorData) => {
    const publishedAt =
      data.status === "published" && !post.publishedAt
        ? new Date()
        : data.publishedAt;

    // Parallelize updates
    await Promise.all([
      orpcClient.posts.admin.update({
        id: post.id,
        data: {
          ...data,
          publishedAt,
        },
      }),
      orpcClient.tags.admin.setPostTags({
        postId: post.id,
        tagIds: data.tagIds,
      }),
    ]);

    // Invalidate cache to ensure fresh data on next visit
    queryClient.invalidateQueries({
      queryKey: orpc.posts.admin.get.key({ input: { id: postId } }),
    });
    queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() });
    queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() });
    queryClient.invalidateQueries({ queryKey: orpc.posts.admin.count.key() });
    queryClient.invalidateQueries({ queryKey: orpc.tags.admin.key() });
    queryClient.invalidateQueries({ queryKey: orpc.media.linkedKeys.key() });
  };

  return <PostEditor initialData={initialData} onSave={handleSave} />;
}
