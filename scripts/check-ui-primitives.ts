/**
 * Every control comes from src/components/ui. This fails when a .tsx file
 * outside that folder holds a raw <button>, <input>, <select> or <textarea>
 * beyond what scripts/ui-primitives-baseline.json (path -> count) allows.
 *
 *   bun run lint:ui             # check
 *   bun run lint:ui -- --update # rewrite the baseline to today's counts
 *
 * The baseline only shrinks: fix an occurrence, then lower its count.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "@typescript/typescript6";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "scripts", "ui-primitives-baseline.json");
const RAW_TAGS = new Set(["button", "input", "select", "textarea"]);
const ALLOWED_DIR = "src/components/ui/";

export type Counts = Record<string, number>;

/** Raw control elements in a .tsx source text. */
export function countRawControls(fileName: string, text: string) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let count = 0;
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      RAW_TAGS.has(node.tagName.text)
    ) {
      count++;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count;
}

export interface Comparison {
  /** Files over their baseline, or not in it at all. */
  violations: Array<string>;
  /** Files below their baseline, or gone: the baseline can shrink. */
  lowered: Array<string>;
}

export function compareToBaseline(
  current: Counts,
  baseline: Counts,
): Comparison {
  const violations: Array<string> = [];
  const lowered: Array<string> = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file];
    if (allowed === undefined) {
      violations.push(`${file}: ${count} raw control(s) in a new file`);
    } else if (count > allowed) {
      violations.push(
        `${file}: ${count} raw control(s), baseline allows ${allowed}`,
      );
    } else if (count < allowed) {
      lowered.push(`${file}: ${allowed} -> ${count}`);
    }
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if (!(file in current)) lowered.push(`${file}: ${allowed} -> 0`);
  }
  return { violations, lowered };
}

function tsxFiles(dir: string): Array<string> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

function currentCounts() {
  const counts: Counts = {};
  for (const file of tsxFiles(path.join(root, "src")).sort()) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative.startsWith(ALLOWED_DIR)) continue;
    const count = countRawControls(relative, readFileSync(file, "utf8"));
    if (count > 0) counts[relative] = count;
  }
  return counts;
}

function main() {
  const current = currentCounts();
  const total = Object.values(current).reduce((sum, n) => sum + n, 0);

  if (process.argv.includes("--update")) {
    writeFileSync(baselineFile, `${JSON.stringify(current, null, 2)}\n`);
    console.log(
      `lint:ui: baseline rewritten, ${total} raw control(s) in ${Object.keys(current).length} file(s)`,
    );
    return;
  }

  const baseline = JSON.parse(readFileSync(baselineFile, "utf8")) as Counts;
  const { violations, lowered } = compareToBaseline(current, baseline);
  if (violations.length) {
    console.error(
      `lint:ui: raw <button>, <input>, <select> or <textarea> outside src/components/ui:\n${violations.map((line) => `  ${line}`).join("\n")}\nUse the primitive from src/components/ui instead.`,
    );
    process.exit(1);
  }
  if (lowered.length) {
    console.log(
      `lint:ui: fewer raw controls than the baseline, run \`bun run lint:ui -- --update\` to lower it:\n${lowered.map((line) => `  ${line}`).join("\n")}`,
    );
  }
  console.log(`lint:ui: ok, ${total} grandfathered raw control(s)`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
