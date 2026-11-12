import { createFileRoute } from "@tanstack/react-router";
import { AgentSkillSection } from "@/features/agent-skill/components/agent-skill-section";
import { siteDomainQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/access/agent-skill")({
  ssr: false,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(siteDomainQuery);
    return { title: m.settings_nav_agent_skill() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: AgentSkillSection,
});
