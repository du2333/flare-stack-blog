import { createFileRoute, redirect } from "@tanstack/react-router";
import { PostHistoryEmpty } from "@/features/posts/components/post-editor/post-history-page";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import { postByIdQuery, postRevisionListQuery } from "@/features/posts/queries";
import { m } from "@/paraglide/messages";

// There is no list-only page: this address opens the latest Post Revision,
// replacing its own history entry so Back returns to the editor.
export const Route = createFileRoute("/admin/posts/edit/$id/history")({
  ssr: "data-only",
  component: HistoryEmpty,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const [post, revisions] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      // Read fresh: a cached list may predate a publish.
      context.queryClient.fetchQuery({
        ...postRevisionListQuery(postId),
        staleTime: 0,
      }),
    ]);
    const latest = revisions[0];
    if (latest) {
      throw redirect({
        to: "/admin/posts/edit/$id/history/$revisionId",
        params: { id: params.id, revisionId: String(latest.id) },
        replace: true,
      });
    }
    return { title: post?.title ?? m.editor_history_list_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function HistoryEmpty() {
  const { id } = Route.useParams();
  return <PostHistoryEmpty postId={Number(id)} />;
}
