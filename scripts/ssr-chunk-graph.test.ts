import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findSsrEntryBackEdges } from "./ssr-chunk-graph";

function writeAssets(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ssr-chunk-graph-"));
  for (const [name, source] of Object.entries(files)) {
    const file = path.join(dir, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, source);
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

  it("ignores import() text that has no emitted chunk, such as JSDoc types", () => {
    const dir = writeAssets({
      "index.js": `
        /** @param {import("./runtime.js").Locale} locale */
        function setLocale(locale) {}
      `,
    });

    expect(findSsrEntryBackEdges(dir)).toEqual([]);
  });

  it("follows a stub index.js into assets/worker-entry-*.js", () => {
    const dir = writeAssets({
      "index.js": `export { a as default } from "./assets/worker-entry-abc.js";`,
      "assets/worker-entry-abc.js": `
        async function loadEntries() {
          await import("./router-xyz.js");
        }
      `,
      "assets/router-xyz.js": `import { g } from "./worker-entry-abc.js";`,
    });

    expect(findSsrEntryBackEdges(dir)).toEqual([
      { from: "router-xyz.js", to: "worker-entry-abc.js" },
    ]);
  });
});
