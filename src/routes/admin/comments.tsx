import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import {
  adminCommentsSearchSchema,
  withoutHiddenFilters,
} from "@/features/comments/admin-comments-search";
import {
  AdminCommentsPage,
  type AdminCommentsSearch,
} from "@/features/comments/components/admin/admin-comments-page";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/comments")({
  ssr: false,
  validateSearch: adminCommentsSearchSchema,
  // The 待回复 view has no search and no Post filter to clear them with.
  beforeLoad: ({ search }) => {
    const cleaned = withoutHiddenFilters(search);
    if (cleaned)
      throw redirect({ to: "/admin/comments", search: cleaned, replace: true });
  },
  loader: () => ({ title: m.admin_comments_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: CommentsRoute,
});

function CommentsRoute() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const current = useRef(search);
  current.current = search;
  const onChange = useCallback(
    (updates: Partial<AdminCommentsSearch>, replace = false) => {
      void navigate({
        to: "/admin/comments",
        search: { ...current.current, ...updates },
        replace,
      });
    },
    [navigate],
  );
  return <AdminCommentsPage search={search} onChange={onChange} />;
}
