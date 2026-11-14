import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import skillRevision from "../src/features/agent-skill/skill-revision.json";
import {
  agentSkillDigest,
  agentSkillRevision,
  packAgentSkill,
} from "./vite-agent-skill-zip.ts";

const repoRoot = path.resolve(import.meta.dirname, "..");
const decoder = new TextDecoder();

function skillTree(root: string, files: Record<string, string>) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, ".agents/skills/flare-stack-blog", name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

describe("packAgentSkill", () => {
  it("holds the published Skill's files under a top-level flare-stack-blog folder", () => {
    const root = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
    skillTree(root, {
      "SKILL.md": "# skill\n",
      "references/b.md": "b",
      "references/a.md": "a",
    });
    // The repository's own skills are never packed.
    const internal = path.join(root, ".agents/skills/internal/SKILL.md");
    mkdirSync(path.dirname(internal), { recursive: true });
    writeFileSync(internal, "internal");

    const entries = unzipSync(packAgentSkill(root));
    expect(Object.keys(entries)).toEqual([
      "flare-stack-blog/",
      "flare-stack-blog/SKILL.md",
      "flare-stack-blog/references/",
      "flare-stack-blog/references/a.md",
      "flare-stack-blog/references/b.md",
    ]);
    expect(decoder.decode(entries["flare-stack-blog/references/a.md"])).toBe(
      "a",
    );
  });

  it("gives the same bytes for the same sources, whenever and wherever it runs", () => {
    const a = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
    const b = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
    skillTree(a, { "z.md": "z", "SKILL.md": "s" });
    skillTree(b, { "SKILL.md": "s", "z.md": "z" });
    const first = packAgentSkill(a);
    expect(packAgentSkill(b)).toEqual(first);
    expect(packAgentSkill(a)).toEqual(first);
  });

  it("matches the repository's Skill file by file", () => {
    const entries = unzipSync(packAgentSkill(repoRoot));
    const dir = path.join(repoRoot, ".agents/skills/flare-stack-blog");
    const files = readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path
          .relative(dir, path.join(entry.parentPath, entry.name))
          .split(path.sep)
          .join("/"),
      );
    expect(files).toContain("SKILL.md");
    for (const file of files) {
      const packed = entries[`flare-stack-blog/${file}`];
      expect(packed, file).toBeDefined();
      expect(
        Buffer.from(packed!).equals(readFileSync(path.join(dir, file))),
      ).toBe(true);
    }
    expect(
      Object.keys(entries).filter((name) => !name.endsWith("/")),
    ).toHaveLength(files.length);
  });
});

describe("the Skill's revision", () => {
  it("is read from the line of SKILL.md that states it", () => {
    const root = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
    skillTree(root, {
      "SKILL.md": "# skill\n\nThis copy is revision 12 of the Skill. More.\n",
    });
    expect(agentSkillRevision(root)).toBe(12);

    const without = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
    skillTree(without, { "SKILL.md": "# skill\n" });
    expect(agentSkillRevision(without)).toBeNull();
  });

  it("leaves the digest alone when only the stated revision changes", () => {
    const tree = (skill: string, extra = "a") => {
      const root = mkdtempSync(path.join(tmpdir(), "skill-zip-"));
      skillTree(root, { "SKILL.md": skill, "references/a.md": extra });
      return agentSkillDigest(root);
    };
    const first = tree("This copy is revision 1 of the Skill.\nRules.\n");
    expect(tree("This copy is revision 2 of the Skill.\nRules.\n")).toBe(first);
    expect(tree("This copy is revision 1 of the Skill.\nRule.\n")).not.toBe(
      first,
    );
    expect(
      tree("This copy is revision 1 of the Skill.\nRules.\n", "b"),
    ).not.toBe(first);
  });

  // A blog states this revision, and an agent holding a lower one offers its
  // human the update: content that changes under the same number never
  // reaches the copies already installed.
  it("was raised with the last change to the repository's Skill", () => {
    const hint =
      "The Skill's content changed: run `bun scripts/agent-skill-revision.ts` to give it a new revision.";
    expect(agentSkillDigest(repoRoot), hint).toBe(skillRevision.digest);
    expect(agentSkillRevision(repoRoot), hint).toBe(skillRevision.revision);
  });
});
