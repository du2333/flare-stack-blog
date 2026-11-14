/**
 * Raises the published Skill's revision when its content has changed.
 *
 *   bun scripts/agent-skill-revision.ts
 *
 * A blog states the revision of the Skill it serves, and an agent holding a
 * lower one offers its human the update. So every change to the Skill's
 * content takes a new revision: this script writes the next number into
 * `SKILL.md` and records it, with the content's digest, in
 * `src/features/agent-skill/skill-revision.json`. Run again with nothing
 * changed, it writes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  AGENT_SKILL_NAME,
  AGENT_SKILL_REVISION_LINE,
  agentSkillDigest,
  agentSkillRevision,
} from "./vite-agent-skill-zip.ts";

const root = path.resolve(import.meta.dirname, "..");
const recordFile = path.join(
  root,
  "src/features/agent-skill/skill-revision.json",
);
const skillFile = path.join(
  root,
  ".agents/skills",
  AGENT_SKILL_NAME,
  "SKILL.md",
);

const record = JSON.parse(readFileSync(recordFile, "utf8")) as {
  revision: number;
  digest: string;
};
const digest = agentSkillDigest(root);
const stated = agentSkillRevision(root);

if (stated === null) {
  console.error(
    `SKILL.md has no line of the form "This copy is revision <n> of the Skill."; restore it.`,
  );
  process.exit(1);
}

if (digest === record.digest && stated === record.revision) {
  console.log(`The Skill is unchanged at revision ${record.revision}.`);
  process.exit(0);
}

// Unchanged content keeps its revision, whatever SKILL.md was edited to say.
const revision =
  digest === record.digest ? record.revision : record.revision + 1;
if (stated !== revision) {
  const skill = readFileSync(skillFile, "utf8");
  writeFileSync(
    skillFile,
    skill.replace(AGENT_SKILL_REVISION_LINE, (line, old: string) =>
      line.replace(old, String(revision)),
    ),
  );
}
writeFileSync(recordFile, `${JSON.stringify({ revision, digest }, null, 2)}\n`);
console.log(
  digest === record.digest
    ? `SKILL.md states revision ${revision} again; its content has not changed.`
    : `The Skill is now revision ${revision}.`,
);
