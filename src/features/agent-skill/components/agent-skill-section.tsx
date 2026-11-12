import type { ReactNode } from "react";
import { SettingsLead } from "@/features/config/components/admin/settings-lead";
import { m } from "@/paraglide/messages";
import { InstallStep } from "./install-step";
import { PairedAgents } from "./paired-agents";
import { PairingStep } from "./pairing-step";
import { TryStep } from "./try-step";
import "./agent-skill.css";

/** One step of the stepper: its number and the line to the next, then its content. */
function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="agent-skill-step">
      <span className="agent-skill-step-number" aria-hidden="true">
        {number}
      </span>
      <div className="agent-skill-step-main">
        <h2>{title}</h2>
        {children}
      </div>
    </li>
  );
}

export function AgentSkillSection() {
  return (
    <div className="agent-skill">
      <SettingsLead description={m.agent_skill_intro()} />
      <ol className="agent-skill-steps">
        <Step number={1} title={m.agent_skill_step_install()}>
          <InstallStep />
        </Step>
        <Step number={2} title={m.agent_skill_step_pair()}>
          <PairingStep />
        </Step>
        <Step number={3} title={m.agent_skill_step_try()}>
          <TryStep />
        </Step>
      </ol>
      <PairedAgents />
    </div>
  );
}
