/**
 * The paraglide messages are `export * as m`. A bundler keeps only the messages
 * a page reads as `m.some_key()`; once `m` itself is passed, assigned, spread or
 * indexed, the namespace is a runtime value and every page ships all messages.
 * This finds the places in `src` that use the `m` imported from
 * `@/paraglide/messages` in any way other than a property access `m.<name>`
 * (`typeof m.<name>` in a type is erased and fine).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "@typescript/typescript6";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MESSAGES_MODULE = "@/paraglide/messages";
const SKIPPED_DIR = "src/paraglide/";

function sourceFiles(dir: string): Array<string> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
      ? [full]
      : [];
  });
}

/** Files of `src` (outside src/paraglide) that mention the messages module. */
export function readSources(): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const file of sourceFiles(path.join(root, "src"))) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative.startsWith(SKIPPED_DIR)) continue;
    const text = readFileSync(file, "utf8");
    if (text.includes(MESSAGES_MODULE)) sources[relative] = text;
  }
  return sources;
}

/** The names an import declaration gives the `m` namespace. */
function messagesBindings(source: ts.SourceFile): Array<ts.Identifier> {
  const bindings: Array<ts.Identifier> = [];
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== MESSAGES_MODULE
    ) {
      continue;
    }
    const named = statement.importClause?.namedBindings;
    if (!named) continue;
    if (ts.isNamespaceImport(named)) {
      bindings.push(named.name);
      continue;
    }
    for (const element of named.elements) {
      if ((element.propertyName ?? element.name).text === "m") {
        bindings.push(element.name);
      }
    }
  }
  return bindings;
}

/** A read that keeps `m.<name>` static: `m.name`, or `typeof m.name`. */
function isStaticRead(id: ts.Identifier) {
  const parent = id.parent;
  if (ts.isPropertyAccessExpression(parent)) return parent.expression === id;
  return ts.isQualifiedName(parent) && parent.left === id;
}

/**
 * Uses of the messages namespace other than `m.<name>`, as
 * `file:line: text`. `sources` maps a file name to its text.
 */
export function findNamespaceUses(
  sources: Record<string, string>,
): Array<string> {
  const host = ts.createCompilerHost({});
  const names = Object.keys(sources);
  host.getSourceFile = (fileName, languageVersion) => {
    const text = sources[fileName];
    return text === undefined
      ? undefined
      : ts.createSourceFile(
          fileName,
          text,
          languageVersion,
          true,
          fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
  };
  host.fileExists = (fileName) => fileName in sources;
  host.readFile = (fileName) => sources[fileName];

  // Binding only: imports stay unresolved, which is enough to tell the
  // imported `m` from a local variable or parameter that shadows it.
  const program = ts.createProgram(
    names,
    {
      noResolve: true,
      noLib: true,
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.Latest,
    },
    host,
  );
  const checker = program.getTypeChecker();

  const found: Array<string> = [];
  for (const name of names) {
    const source = program.getSourceFile(name);
    if (!source) continue;
    const imported = new Set(
      messagesBindings(source).flatMap((id) => {
        const symbol = checker.getSymbolAtLocation(id);
        return symbol ? [symbol] : [];
      }),
    );
    if (imported.size === 0) continue;

    const visit = (node: ts.Node) => {
      if (
        ts.isIdentifier(node) &&
        !ts.isImportSpecifier(node.parent) &&
        !ts.isNamespaceImport(node.parent) &&
        !isStaticRead(node)
      ) {
        // `{ m }` names the property; the value it reads is another symbol.
        const symbol = ts.isShorthandPropertyAssignment(node.parent)
          ? checker.getShorthandAssignmentValueSymbol(node.parent)
          : checker.getSymbolAtLocation(node);
        if (symbol && imported.has(symbol)) {
          const { line } = source.getLineAndCharacterOfPosition(
            node.getStart(source),
          );
          const context = node.parent.getText(source).split("\n")[0];
          found.push(`${name}:${line + 1}: ${context}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}
