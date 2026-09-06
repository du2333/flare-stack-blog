import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findSsrEntryBackEdges } from "./ssr-chunk-graph";

function writeAssets(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ssr-chunk-graph-"));
  for (const [name, source] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), source);
  }
  return dir;
}

describe("findSsrEntryBackEdges", () => {
  it("reports a dynamically imported chunk that statically imports the worker entry", () => {
    const dir = writeAssets({
      "worker-entry-abc.js": `
        async function loadEntries() {
          await import("./router-xyz.js");
        }
      `,
      "router-xyz.js": `import { g as getDb } from "./worker-entry-abc.js";\nexport const getRouter = () => ({});`,
    });

    expect(findSsrEntryBackEdges(dir)).toEqual([
      { from: "router-xyz.js", to: "worker-entry-abc.js" },
    ]);
  });

  it("is empty when dynamic imports do not point back at the worker entry", () => {
    const dir = writeAssets({
      "worker-entry-abc.js": `
        async function loadEntries() {
          await import("./start-xyz.js");
        }
      `,
      "start-xyz.js": `export const startInstance = {};`,
    });

    expect(findSsrEntryBackEdges(dir)).toEqual([]);
  });

  it("is empty when the worker is a single index.js with no relative dynamic imports", () => {
    const dir = writeAssets({
      "index.js": `
        async function loadEntries() {
          return Promise.resolve().then(() => router);
        }
      `,
    });

    expect(findSsrEntryBackEdges(dir)).toEqual([]);
  });
});
