import { createFileRoute } from "@tanstack/react-router";
import { PostHistoryIndex } from "@/features/posts/components/post-editor/post-history-page";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import { postByIdQuery, postRevisionListQuery } from "@/features/posts/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts/edit/$id/history")({
  ssr: "data-only",
  component: HistoryIndex,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const [post] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      context.queryClient.ensureQueryData(postRevisionListQuery(postId)),
    ]);
    return { title: post?.title ?? m.editor_history_list_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function HistoryIndex() {
  const { id } = Route.useParams();
  return <PostHistoryIndex postId={Number(id)} />;
}
