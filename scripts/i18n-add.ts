/**
 * Adds message keys right after an existing key in every file under messages/.
 *
 *   bun run i18n:add -- <key> --after <existing key> --zh "<text>" --en "<text>"
 *   bun run i18n:add -- --file adds.json     # [{ "key", "after", "zh", "en" }, ...]
 *
 * Each locale file present needs a value (`--<locale>`, or the field of that
 * name in the JSON file). The files are edited as text, so every other line
 * stays as it is. An existing key or a missing anchor stops the run before
 * anything is written.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const messagesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../messages",
);

export interface KeyToAdd {
  key: string;
  after: string;
  /** Message text by locale, e.g. `{ zh: "...", en: "..." }`. */
  values: Record<string, string | undefined>;
}

/** `text` (a messages file) with `key` inserted right after the entry of `after`. */
export function insertKey(
  text: string,
  key: string,
  after: string,
  value: string,
) {
  const keys = Object.keys(JSON.parse(text) as Record<string, unknown>);
  if (keys.includes(key)) throw new Error(`key already exists: ${key}`);
  if (!keys.includes(after)) throw new Error(`anchor key not found: ${after}`);

  const lines = text.split("\n");
  const start = lines.findIndex((line) =>
    line.startsWith(`  ${JSON.stringify(after)}:`),
  );
  if (start === -1) throw new Error(`anchor key not found: ${after}`);
  // An entry runs until the next top-level key or the closing brace.
  let end = start + 1;
  while (end < lines.length && !/^( {2}"|\})/.test(lines[end]!)) end++;
  const last = end - 1;

  const entry = `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  if (lines[last]!.endsWith(",")) {
    lines.splice(end, 0, `${entry},`);
  } else {
    lines[last] = `${lines[last]},`;
    lines.splice(end, 0, entry);
  }
  return lines.join("\n");
}

function localeFiles() {
  return readdirSync(messagesDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function fail(message: string): never {
  console.error(`i18n:add: ${message}`);
  process.exit(1);
}

function main() {
  const files = localeFiles();
  const locales = files.map((name) => path.basename(name, ".json"));
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      after: { type: "string" },
      file: { type: "string" },
      ...Object.fromEntries(
        locales.map((locale) => [locale, { type: "string" as const }]),
      ),
    },
  });

  let adds: Array<KeyToAdd>;
  if (typeof values.file === "string") {
    if (!existsSync(values.file)) fail(`${values.file} does not exist`);
    const rows = JSON.parse(readFileSync(values.file, "utf8")) as Array<
      Record<string, string>
    >;
    adds = rows.map((row) => ({
      key: row.key!,
      after: row.after!,
      values: Object.fromEntries(
        locales.map((locale) => [locale, row[locale]!]),
      ),
    }));
  } else {
    const [key] = positionals;
    adds = [
      {
        key: key!,
        after: values.after as string,
        values: Object.fromEntries(
          locales.map((locale) => [
            locale,
            (values as Record<string, string | undefined>)[locale],
          ]),
        ),
      },
    ];
  }

  for (const add of adds) {
    if (!add.key || !add.after) {
      fail("each key needs <key> and --after <existing key>");
    }
    for (const locale of locales) {
      if (typeof add.values[locale] !== "string") {
        fail(`${add.key}: missing a value for ${locale} (--${locale})`);
      }
    }
  }

  // Work on copies of the text and write only when every key went in.
  const texts = new Map(
    files.map((name) => [
      name,
      readFileSync(path.join(messagesDir, name), "utf8"),
    ]),
  );
  try {
    for (const add of adds) {
      for (const [index, name] of files.entries()) {
        texts.set(
          name,
          insertKey(
            texts.get(name)!,
            add.key,
            add.after,
            add.values[locales[index]!]!,
          ),
        );
      }
    }
  } catch (error) {
    fail((error as Error).message);
  }
  for (const [name, text] of texts) {
    writeFileSync(path.join(messagesDir, name), text);
  }
  console.log(
    `added ${adds.map((add) => add.key).join(", ")} to ${files.join(", ")}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
