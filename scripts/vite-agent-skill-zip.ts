import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type Zippable, zipSync } from "fflate";
import type { Plugin } from "vite";

/** The one Skill that is published to users; the others here are the repository's own. */
export const AGENT_SKILL_NAME = "flare-stack-blog";
/** Where the zip is served, in the build and under the dev server. */
export const AGENT_SKILL_ZIP_PATH = "/agent-skill.zip";

const SKILL_DIR = path.join(".agents/skills", AGENT_SKILL_NAME);
// ZIP stores local time with no zone, and fflate reads a Date through its local
// getters, so a Date built from local fields keeps the same bytes in any zone.
const FIXED_TIME = new Date(2000, 0, 1, 12, 0, 0);

// Unix modes in the high half of the external attributes (os 3 = Unix), so an
// unzip gives readable files and an enterable folder, as the old attachment did.
const UNIX_FILE = { os: 3, attrs: (0o100644 << 16) >>> 0 };
const UNIX_DIR = { os: 3, attrs: ((0o040755 << 16) | 0x10) >>> 0 };

/** Every file under `dir` as slash-separated relative paths, in byte order. */
function listFiles(dir: string, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(dir, prefix), {
    withFileTypes: true,
  })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...listFiles(dir, relative));
    else if (entry.isFile()) found.push(relative);
  }
  return found.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The line of `SKILL.md` that states the copy's revision; an agent compares it with the blog's. */
export const AGENT_SKILL_REVISION_LINE =
  /^This copy is revision (\d+) of the Skill\./m;

/** The revision the Skill under `root` states, or null when it states none. */
export function agentSkillRevision(root: string): number | null {
  const skill = readFileSync(path.resolve(root, SKILL_DIR, "SKILL.md"), "utf8");
  const stated = AGENT_SKILL_REVISION_LINE.exec(skill)?.[1];
  return stated === undefined ? null : Number(stated);
}

/**
 * A digest of the Skill's files with the stated revision left out, so raising
 * the revision alone does not change it. It tells whether the Skill's content
 * differs from the content a revision was recorded for.
 */
export function agentSkillDigest(root: string): string {
  const dir = path.resolve(root, SKILL_DIR);
  const hash = createHash("sha256");
  for (const file of listFiles(dir)) {
    const bytes = readFileSync(path.join(dir, file));
    const content =
      file === "SKILL.md"
        ? bytes
            .toString("utf8")
            .replace(AGENT_SKILL_REVISION_LINE, (line, stated: string) =>
              line.replace(stated, "N"),
            )
        : bytes;
    hash.update(`${file}\0${content.length}\0`).update(content);
  }
  return hash.digest("hex");
}

/**
 * Packs the Skill from the working tree (not from git, which holds only what is
 * committed) into a zip with a top-level `flare-stack-blog/` folder. Entries are
 * sorted and carry a fixed timestamp, so the same sources give the same bytes.
 */
export function packAgentSkill(root: string): Uint8Array {
  const dir = path.resolve(root, SKILL_DIR);
  const files = listFiles(dir);
  const folders = new Set<string>([AGENT_SKILL_NAME]);
  for (const file of files) {
    const parts = file.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      folders.add(`${AGENT_SKILL_NAME}/${parts.slice(0, i).join("/")}`);
    }
  }
  const entries: Array<[string, Zippable[string]]> = [
    ...[...folders].map((folder): [string, Zippable[string]] => [
      `${folder}/`,
      [new Uint8Array(0), { level: 0, mtime: FIXED_TIME, ...UNIX_DIR }],
    ]),
    ...files.map((file): [string, Zippable[string]] => [
      `${AGENT_SKILL_NAME}/${file}`,
      [
        new Uint8Array(readFileSync(path.join(dir, file))),
        { level: 9, mtime: FIXED_TIME, ...UNIX_FILE },
      ],
    ]),
  ];
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return zipSync(Object.fromEntries(entries));
}

/**
 * Serves the Skill zip at `/agent-skill.zip`: emitted as a static asset by the
 * client build (the platform answers it before the Worker runs), and built per
 * request under the dev server so a Skill edit shows up at once.
 */
export function agentSkillZipPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "agent-skill-zip",
    configResolved(config) {
      root = config.root;
    },
    generateBundle() {
      if (this.environment.name !== "client") return;
      this.emitFile({
        type: "asset",
        fileName: AGENT_SKILL_ZIP_PATH.slice(1),
        source: packAgentSkill(root),
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== AGENT_SKILL_ZIP_PATH) return next();
        const zip = packAgentSkill(root);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Length", zip.byteLength);
        res.setHeader("Cache-Control", "no-store");
        res.end(zip);
      });
    },
  };
}
