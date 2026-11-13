/**
 * Fails when a package that must exist once in node_modules also exists nested
 * under another package. After an incremental `bun add` of TanStack packages
 * `@tanstack/react-router` was installed a second time under
 * the `@tanstack/react-start` packages' own `node_modules`; the route `Register`
 * augmentation then stopped applying and tsc reported hundreds of errors that
 * name nothing of the cause.
 *
 *   bun scripts/check-single-packages.ts
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SINGLE_PACKAGES = [
  "@tanstack/react-router",
  "@tanstack/router-core",
  "react",
  "react-dom",
];

export const CURE = "rm -rf node_modules/@tanstack && bun install";

/** The package folders directly inside a node_modules folder, scoped ones included. */
function packageDirs(nodeModules: string) {
  const found: Array<string> = [];
  for (const entry of readdirSync(nodeModules, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) {
      if (!entry.isDirectory()) continue;
      const scope = path.join(nodeModules, entry.name);
      for (const inner of readdirSync(scope, { withFileTypes: true })) {
        if (inner.isDirectory()) found.push(path.join(scope, inner.name));
      }
    } else if (entry.isDirectory()) {
      found.push(path.join(nodeModules, entry.name));
    }
  }
  return found;
}

/**
 * Nested copies of SINGLE_PACKAGES: paths of the form
 * `<root>/<package>/node_modules/<single package>`, at any depth. Only nested
 * node_modules folders are walked, never package contents, and symlinks are
 * not followed.
 */
export function findNestedCopies(
  nodeModules: string,
  singles: ReadonlyArray<string> = SINGLE_PACKAGES,
) {
  const copies: Array<string> = [];
  const visit = (dir: string) => {
    for (const pkg of packageDirs(dir)) {
      const nested = path.join(pkg, "node_modules");
      if (!existsSync(nested)) continue;
      for (const name of singles) {
        const copy = path.join(nested, name);
        if (existsSync(copy)) copies.push(copy);
      }
      visit(nested);
    }
  };
  if (existsSync(nodeModules)) visit(nodeModules);
  return copies.sort();
}

/** The failure message, or undefined when every package exists once. */
export function describeNestedCopies(
  nodeModules: string,
  copies: ReadonlyArray<string>,
) {
  if (copies.length === 0) return undefined;
  const root = path.dirname(nodeModules);
  return `check-single-packages: a package that must exist once is installed again inside another package, and the TypeScript types stop agreeing (tsc then reports hundreds of unrelated errors):\n${copies
    .map((copy) => `  ${path.relative(root, copy)}`)
    .join("\n")}\nCure: ${CURE}`;
}

/** Checks a node_modules folder; the message when it is broken. */
export function checkSinglePackages(nodeModules: string) {
  return describeNestedCopies(nodeModules, findNestedCopies(nodeModules));
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const message = checkSinglePackages(path.join(root, "node_modules"));
  if (message) {
    console.error(message);
    process.exit(1);
  }
  console.log("check-single-packages: ok");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
