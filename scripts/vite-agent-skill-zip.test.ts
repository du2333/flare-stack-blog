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
import { packAgentSkill } from "./vite-agent-skill-zip.ts";

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
