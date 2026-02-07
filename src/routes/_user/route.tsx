import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ErrorPage } from "@/components/common/error-page";
import { CACHE_CONTROL } from "@/lib/constants";
import { sessionQuery } from "@/features/auth/queries";

export const Route = createFileRoute("/_user")({
  loader: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQuery);
    return { session };
  },
  component: UserLayout,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  headers: () => {
    return CACHE_CONTROL.private;
  },
});

function UserLayout() {
  const { session } = Route.useLoaderData();

  if (!session?.user) {
    return (
      <div className="min-h-screen font-sans relative antialiased">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03)_0%,transparent_70%)] in-[.dark]:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
        </div>
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="max-w-md w-full space-y-8 text-center">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
              请先登录
            </h1>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              你需要登录后才能访问此页面。
            </p>
            <div className="flex items-center justify-center gap-6 pt-4">
              <Link
                to="/login"
                className="text-sm font-mono text-foreground hover:text-foreground/80 transition-colors"
              >
                [ 前往登录 ]
              </Link>
              <Link
                to="/"
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans relative antialiased">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03)_0%,transparent_70%)] in-[.dark]:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
