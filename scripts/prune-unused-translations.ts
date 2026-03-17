import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const messagesDir = path.join(projectRoot, "messages");
const localeFiles = ["en.json", "zh.json"] as const;
const scanRoots = ["src", "scripts", "tests"] as const;
const supportedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".wrangler",
]);

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag);
}

function readJsonFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
    string,
    unknown
  >;
}

function isPrimitive(value: unknown) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function formatJson(value: unknown, indent = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    if (value.every(isPrimitive)) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }

    const currentIndent = " ".repeat(indent);
    const childIndent = " ".repeat(indent + 2);

    return `[\n${value
      .map((item) => `${childIndent}${formatJson(item, indent + 2)}`)
      .join(",\n")}\n${currentIndent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";

    const currentIndent = " ".repeat(indent);
    const childIndent = " ".repeat(indent + 2);

    return `{\n${entries
      .map(
        ([key, childValue]) =>
          `${childIndent}${JSON.stringify(key)}: ${formatJson(
            childValue,
            indent + 2,
          )}`,
      )
      .join(",\n")}\n${currentIndent}}`;
  }

  return JSON.stringify(value);
}

function writeJsonFile(filePath: string, content: Record<string, unknown>) {
  fs.writeFileSync(filePath, `${formatJson(content)}\n`);
}

function getTranslationKeys(messages: Record<string, unknown>) {
  return Object.keys(messages).filter((key) => key !== "$schema");
}

function getAllTranslationKeys(files: ReadonlyArray<string>) {
  const keys = new Set<string>();

  for (const fileName of files) {
    const filePath = path.join(messagesDir, fileName);
    const messages = readJsonFile(filePath);

    for (const key of getTranslationKeys(messages)) {
      keys.add(key);
    }
  }

  return keys;
}

function collectSourceFiles(rootPath: string): string[] {
  if (!fs.existsSync(rootPath)) return [];

  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      if (absolutePath === path.join(projectRoot, "src", "paraglide")) continue;

      files.push(...collectSourceFiles(absolutePath));
      continue;
    }

    if (!supportedExtensions.has(path.extname(entry.name))) continue;
    files.push(absolutePath);
  }

  return files;
}

function getScriptKind(filePath: string) {
  switch (path.extname(filePath)) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function collectUsedTranslationKeys(
  filePath: string,
  translationKeys: ReadonlySet<string>,
) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );
  const usedKeys = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node)) {
      const key = node.name.text;
      if (translationKeys.has(key)) usedKeys.add(key);
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      const key = node.argumentExpression.text;
      if (translationKeys.has(key)) usedKeys.add(key);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usedKeys;
}

function filterUnusedKeys(
  messages: Record<string, unknown>,
  unusedKeys: ReadonlySet<string>,
) {
  const nextEntries = Object.entries(messages).filter(
    ([key]) => !unusedKeys.has(key),
  );

  return Object.fromEntries(nextEntries) as Record<string, unknown>;
}

try {
  const write = hasFlag("--write");
  const check = hasFlag("--check");
  const rewrite = hasFlag("--rewrite");
  const translationKeys = getAllTranslationKeys(localeFiles);
  const sourceFiles = scanRoots.flatMap((root) =>
    collectSourceFiles(path.join(projectRoot, root)),
  );
  const usedKeys = new Set<string>();

  for (const filePath of sourceFiles) {
    const fileUsedKeys = collectUsedTranslationKeys(filePath, translationKeys);
    for (const key of fileUsedKeys) {
      usedKeys.add(key);
    }
  }

  const unusedKeys = [...translationKeys].filter((key) => !usedKeys.has(key));
  unusedKeys.sort((left, right) => left.localeCompare(right));

  console.log(`Scanned ${sourceFiles.length} source files.`);
  console.log(`Found ${translationKeys.size} translation keys.`);
  console.log(`Detected ${usedKeys.size} used keys.`);
  console.log(`Detected ${unusedKeys.length} unused keys.`);

  if (unusedKeys.length === 0) {
    if (rewrite) {
      for (const fileName of localeFiles) {
        const filePath = path.join(messagesDir, fileName);
        writeJsonFile(filePath, readJsonFile(filePath));
      }

      console.log("Rewrote locale files without changing keys.");
      process.exit(0);
    }

    console.log("No unused translation keys found.");
    process.exit(0);
  }

  console.log("");
  console.log("Unused keys:");
  for (const key of unusedKeys) {
    console.log(`- ${key}`);
  }

  if (write) {
    const unusedKeySet = new Set(unusedKeys);

    for (const fileName of localeFiles) {
      const filePath = path.join(messagesDir, fileName);
      const messages = readJsonFile(filePath);
      const nextMessages = filterUnusedKeys(messages, unusedKeySet);
      writeJsonFile(filePath, nextMessages);
    }

    console.log("");
    console.log(
      `Removed ${unusedKeys.length} unused keys from ${localeFiles.join(", ")}.`,
    );
    process.exit(0);
  }

  console.log("");
  console.log("Run with --write to remove them.");
  process.exit(check ? 1 : 0);
} catch (error) {
  console.error("Failed to prune unused translations.");
  console.error(error);
  process.exit(1);
}
