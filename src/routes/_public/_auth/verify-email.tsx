import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyAuthSearchSchema } from "@/features/auth/auth-search";

// Verification links in old emails still land here; sign-in is by code now.
export const Route = createFileRoute("/_public/_auth/verify-email")({
  validateSearch: legacyAuthSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirectTo: search.redirectTo } });
  },
});
