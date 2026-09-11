import "@/features/posts/components/post-editor/post-editor.css";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { PostEditorReturnProvider } from "@/features/posts/components/post-editor/post-editor-return";

export const Route = createFileRoute("/admin/posts/edit/$id")({
  component: EditorLayout,
});
function EditorLayout() {
  const { id } = Route.useParams();
  const origin = useLocation({
    select: (location) => location.state.taxonomyReturn ?? null,
  });
  return (
    <PostEditorReturnProvider key={id} initialValue={origin}>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </PostEditorReturnProvider>
  );
}
