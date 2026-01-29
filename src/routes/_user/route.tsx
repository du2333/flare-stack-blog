import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import {
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ErrorPage } from "@/components/common/error-page";
import { CACHE_CONTROL } from "@/lib/constants";
import { sessionQuery } from "@/features/auth/queries";

export const Route = createFileRoute("/_user")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: UserLayout,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

function UserLayout() {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();

  useEffect(() => {
    // Reset query errors on route change
    router.subscribe("onBeforeLoad", () => {
      reset();
    });
  }, [router, reset]);

  return (
    <div className="min-h-screen font-sans relative antialiased">
      {/* --- Minimalist Background (Same as Public for consistency, or slightly different?) --- */}
      {/* Let's keep it consistent but maybe darker/cleaner since no Navbar */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03)_0%,transparent_70%)] in-[.dark]:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]"></div>
      </div>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
