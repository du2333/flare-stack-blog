import { createFileRoute } from "@tanstack/react-router";
import { requireFeature } from "@/features/config/features";
import { siteConfigQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/about")({
  // 开关关闭时直接 404 —— 与导航隐藏保持同一判据
  beforeLoad: async ({ context }) => {
    const siteConfig = await context.queryClient.ensureQueryData(
      siteConfigQuery,
    );
    requireFeature(siteConfig, "about");
  },
  component: RouteComponent,
  head: () => ({
    meta: [{ title: m.nav_about() }],
  }),
});

function RouteComponent() {
  // 占位：D6 demo 通过后替换为真实实现
  return (
    <div className="w-full py-16 text-center">
      <h1 className="text-2xl font-semibold">{m.nav_about()}</h1>
      <p className="mt-3 text-sm opacity-60">coming soon</p>
    </div>
  );
}
