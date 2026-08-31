import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StatusPage } from "@/components/common/status-page";
import { PostHistoryPage } from "@/features/posts/components/post-editor/post-history-page";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import {
  postByIdQuery,
  postRevisionDetailQuery,
  postRevisionListQuery,
} from "@/features/posts/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute(
  "/admin/posts/edit/$id/history_/$revisionId",
)({
  ssr: "data-only",
  component: HistoryRevision,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const revisionId = Number(params.revisionId);
    if (!Number.isFinite(postId) || !Number.isFinite(revisionId)) {
      throw notFound();
    }
    const [post] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      context.queryClient.ensureQueryData(postRevisionListQuery(postId)),
      context.queryClient.ensureQueryData(
        postRevisionDetailQuery(postId, revisionId),
      ),
    ]);
    return { title: post?.title ?? m.editor_history_list_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function HistoryRevision() {
  const { id, revisionId: revisionIdParam } = Route.useParams();
  const postId = Number(id);
  const revisionId = Number(revisionIdParam);
  const { data: post } = useQuery(postByIdQuery(postId));
  const { data: revision, isError } = useQuery(
    postRevisionDetailQuery(postId, revisionId),
  );

  if (!post) {
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

  if (isError || !revision) {
    return (
      <StatusPage
        title={m.editor_history_error_revision_not_found()}
        action={
          <Link
            to="/admin/posts/edit/$id/history"
            params={{ id }}
            className="fuwari-btn-primary h-10 rounded-xl px-6 text-sm font-medium"
          >
            {m.editor_history_back()}
          </Link>
        }
      />
    );
  }

  return <PostHistoryPage postId={postId} revisionId={revisionId} />;
}
