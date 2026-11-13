import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Skills live in `.agents/skills`, where most coding agents look. Claude Code
 * reads `.claude/skills`, so each of this repository's own skills has a link
 * there. The Skill that is published to users is installed by them, not
 * loaded from the repository, so it has none.
 */
const root = path.resolve(import.meta.dirname, "..");
const PUBLISHED = "flare-stack-blog";

const skills = readdirSync(path.join(root, ".agents/skills")).filter((name) =>
  lstatSync(path.join(root, ".agents/skills", name)).isDirectory(),
);
const internal = skills.filter((name) => name !== PUBLISHED);

describe("agent skills", () => {
  it("links every internal skill from .claude/skills, and nothing else", () => {
    const links = readdirSync(path.join(root, ".claude/skills")).sort();
    expect(links).toEqual([...internal].sort());
    for (const name of links) {
      const link = path.join(root, ".claude/skills", name);
      expect(lstatSync(link).isSymbolicLink(), `${name} is a link`).toBe(true);
      expect(readlinkSync(link)).toBe(`../../.agents/skills/${name}`);
    }
  });

  it("marks every internal skill so an installer does not offer it", () => {
    for (const name of internal) {
      const skill = readFileSync(
        path.join(root, ".agents/skills", name, "SKILL.md"),
        "utf8",
      );
      const frontmatter = skill.slice(0, skill.indexOf("\n---", 3));
      expect(frontmatter, name).toMatch(/^metadata:\n\s+internal: true$/m);
    }
  });

  it("releases the published skill alone", () => {
    const release = readFileSync(path.join(root, ".release-it.ts"), "utf8");
    expect(release).toContain(`HEAD:.agents/skills ${PUBLISHED}"`);
  });
});
