import { Fragment } from "react";
import { m } from "@/paraglide/messages";
import { CopyLine } from "./copy-line";

/** The skill zip the build packs and this Worker serves (scripts/vite-agent-skill-zip.ts). */
const AGENT_SKILL_URL = "/agent-skill.zip";
const AGENT_SKILL_FILE_NAME = `flare-stack-blog-skills-v${__APP_VERSION__}.zip`;
const AGENT_SKILL_INSTALL_COMMAND = `npx skills add https://github.com/du2333/flare-stack-blog/tree/v${__APP_VERSION__}/.agents/skills/flare-stack-blog -g`;

export function InstallStep() {
  const download = (
    <a
      href={AGENT_SKILL_URL}
      download={AGENT_SKILL_FILE_NAME}
      className="font-medium underline underline-offset-2"
    >
      {m.agent_skill_download({ version: __APP_VERSION__ })}
    </a>
  );
  // The slot goes in as a \0-wrapped name so each locale keeps its own word order.
  const parts = m
    .agent_skill_install_hint({ download: "\0download\0" })
    .split("\0");
  return (
    <>
      <p className="agent-skill-hint">
        {parts.map((part, index) =>
          index % 2 ? <Fragment key={part}>{download}</Fragment> : part,
        )}
      </p>
      <CopyLine
        kind="command"
        text={AGENT_SKILL_INSTALL_COMMAND}
        copyLabel={m.common_copy_code()}
        copiedLabel={m.common_code_copied()}
      />
    </>
  );
}
