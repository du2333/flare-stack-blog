import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import { z } from "zod";
import { withoutHiddenFilters } from "@/features/comments/admin-comments-search";
import { ADMIN_COMMENT_VIEWS } from "@/features/comments/comments.schema";
import {
  AdminCommentsPage,
  type AdminCommentsSearch,
} from "@/features/comments/components/admin/admin-comments-page";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  view: z
    .enum(ADMIN_COMMENT_VIEWS)
    .optional()
    .default("unreplied")
    .catch("unreplied"),
  page: z.number().int().positive().optional().default(1).catch(1),
  search: z.string().max(200).optional().default("").catch(""),
  post: z.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute("/admin/comments")({
  ssr: false,
  validateSearch: searchSchema,
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
