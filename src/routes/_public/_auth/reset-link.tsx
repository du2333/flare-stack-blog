import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyAuthSearchSchema } from "@/features/auth/auth-search";

// Passwords are gone, so this old entry point leads to the one sign-in page.
export const Route = createFileRoute("/_public/_auth/reset-link")({
  validateSearch: legacyAuthSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirectTo: search.redirectTo } });
  },
});
