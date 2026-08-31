import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusPage } from "@/components/common/status-page";
import { PostEditor } from "@/features/posts/components/post-editor";
import { persistableTagIds } from "@/features/posts/components/post-editor/post-editor.model";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import type { PostEditorData } from "@/features/posts/components/post-editor/types";
import { postByIdQuery } from "@/features/posts/queries";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import {
  tagsAdminQueryOptions,
  tagsByPostIdQueryOptions,
} from "@/features/tags/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts/edit/$id/")({
  ssr: "data-only",
  component: EditPost,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const [post] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      context.queryClient.ensureQueryData(tagsByPostIdQueryOptions(postId)),
      context.queryClient.prefetchQuery(tagsAdminQueryOptions()),
      context.queryClient.prefetchQuery(categoriesAdminQueryOptions()),
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

  const { data: post } = useQuery(postByIdQuery(postId));
  const { data: tags } = useQuery(tagsByPostIdQueryOptions(postId));

  if (!post || !tags) {
    return (
      <StatusPage
        title={m.admin_post_edit_not_found_title()}
        description={m.admin_post_edit_not_found_desc({ id: String(postId) })}
        action={
          <Link
            to="/admin/posts"
            className="fuwari-btn-primary h-10 rounded-xl px-6 text-sm font-medium"
          >
            {m.common_back()}
          </Link>
        }
      />
    );
  }

  const initialData = {
    id: post.id,
    title: post.title,
    summary: post.summary ?? "",
    slug: post.slug,
    contentJson: post.contentJson,
    publishedAt: post.publishedAt,
    tagIds: tags.map((t) => t.id),
    categoryId: post.categoryId ?? null,
    pinnedAt: post.pinnedAt,
    hasPublicSnapshot: post.hasPublicSnapshot,
    serverToday: post.serverToday,
    coverMediaId: post.coverMediaId,
    cover: post.cover,
  };

  const handleSave = async (data: PostEditorData) => {
    await Promise.all([
      orpcClient.posts.admin.update({
        id: post.id,
        data: {
          title: data.title,
          summary: data.summary,
          slug: data.slug,
          contentJson: data.contentJson,
          publishedAt: data.publishedAt,
          pinnedAt: data.pinnedAt,
          coverMediaId: data.coverMediaId,
          categoryId: data.categoryId,
        },
      }),
      orpcClient.tags.admin.setPostTags({
        postId: post.id,
        tagIds: persistableTagIds(data.tagIds),
      }),
    ]);

    queryClient.invalidateQueries({
      queryKey: orpc.posts.admin.get.key({ input: { id: postId } }),
    });
    queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() });
    queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() });
    queryClient.invalidateQueries({ queryKey: orpc.tags.admin.key() });
    queryClient.invalidateQueries({ queryKey: orpc.categories.key() });
    queryClient.invalidateQueries({ queryKey: orpc.media.linkedKeys.key() });
  };

  return (
    <PostEditor key={post.id} initialData={initialData} onSave={handleSave} />
  );
}
