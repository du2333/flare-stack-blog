import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DYNAMIC_IMPORT_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;
const WORKER_ENTRY_RE = /^worker-entry-[^/]+\.js$/;

export type SsrChunkBackEdge = {
  from: string;
  to: string;
};

function resolveWorkerEntry(dir: string): { dir: string; file: string } {
  const files = readdirSync(dir).filter((name) => name.endsWith(".js"));
  const workerEntry = files.find((name) => WORKER_ENTRY_RE.test(name));
  if (workerEntry) {
    return { dir, file: workerEntry };
  }
  if (files.includes("index.js")) {
    return { dir, file: "index.js" };
  }
  throw new Error(`No worker-entry-*.js or index.js in ${dir}`);
}

export function findSsrEntryBackEdges(dir: string): SsrChunkBackEdge[] {
  const { dir: entryDir, file: workerEntry } = resolveWorkerEntry(dir);
  const entrySource = readFileSync(path.join(entryDir, workerEntry), "utf8");
  const imported = new Set<string>();
  for (const match of entrySource.matchAll(DYNAMIC_IMPORT_RE)) {
    const specifier = match[1];
    if (specifier) imported.add(specifier);
  }

  const backEdges: SsrChunkBackEdge[] = [];
  const fromPattern = new RegExp(
    `from\\s+["']\\./${workerEntry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
  );
  for (const specifier of imported) {
    const importedPath = path.join(entryDir, specifier);
    const importedSource = readFileSync(importedPath, "utf8");
    if (fromPattern.test(importedSource)) {
      backEdges.push({ from: specifier, to: workerEntry });
    }
  }
  return backEdges;
}

if (import.meta.main) {
  const dir = process.argv[2] ?? "dist/server";
  const backEdges = findSsrEntryBackEdges(dir);
  if (backEdges.length > 0) {
    console.error(
      `SSR worker-entry dynamically imports chunks that import it back:\n${backEdges
        .map((edge) => `  ${edge.from} -> ${edge.to}`)
        .join("\n")}`,
    );
    process.exit(1);
  }
}
