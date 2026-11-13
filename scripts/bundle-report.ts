/**
 * What a browser preloads for each kind of public page, read from the built
 * route manifest:
 *
 *   bun run build && bun scripts/bundle-report.ts
 *
 * Sizes are raw / brotli at maximum quality. With source maps
 * (`BUNDLE_SOURCEMAP=1 bun run build`) it can also say where a page's bytes
 * come from:
 *
 *   bun scripts/bundle-report.ts --sources home [path-filter]
 *
 * `--check` compares each page's preloaded scripts and stylesheets (brotli)
 * with `bundle-budgets.json` and exits 1 for a page over budget. CI runs it
 * after the build, which has no source maps, so the budgets are measured
 * without them.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { brotliCompressSync } from "node:zlib";
import { decode } from "@jridgewell/sourcemap-codec";
import budgetFile from "./bundle-budgets.json";

interface ManifestRoute {
  preloads?: Array<string>;
  css?: Array<string>;
  assets?: Array<{ attrs?: { href?: string; src?: string } }>;
}

/** The routes a page of each kind matches. */
export const PAGES: Record<string, Array<string>> = {
  home: ["__root__", "/_public", "/_public/"],
  post: ["__root__", "/_public", "/_public/post/$slug"],
  posts: ["__root__", "/_public", "/_public/posts"],
  moments: ["__root__", "/_public", "/_public/moments/"],
  "friend-links": ["__root__", "/_public", "/_public/friend-links"],
};

const output = path.resolve(".cloudflare/output/v0/workers/default");
const clientDir = path.join(output, "assets");

async function readManifest(): Promise<Record<string, ManifestRoute>> {
  const dir = path.join(output, "bundle/assets");
  const file = readdirSync(dir).find(
    (name) =>
      name.startsWith("_tanstack-start-manifest") && name.endsWith(".js"),
  );
  if (!file) throw new Error(`No route manifest in ${dir}; build first.`);
  // A module without imports that exports the manifest as a function.
  const module: {
    tsrStartManifest: () => { routes: Record<string, ManifestRoute> };
  } = await import(pathToFileURL(path.join(dir, file)).href);
  return module.tsrStartManifest().routes;
}

/** The scripts and stylesheets the routes of one page name. */
export function pageFiles(
  routes: Record<string, ManifestRoute>,
  routeIds: Array<string>,
) {
  const js = new Set<string>();
  const css = new Set<string>();
  for (const id of routeIds) {
    const route = routes[id];
    if (!route) throw new Error(`Route ${id} is not in the manifest.`);
    for (const file of route.preloads ?? []) js.add(file);
    for (const file of route.css ?? []) css.add(file);
    for (const asset of route.assets ?? []) {
      const href = asset.attrs?.href ?? asset.attrs?.src;
      if (href?.endsWith(".css")) css.add(href);
      if (href?.endsWith(".js")) js.add(href);
    }
  }
  return { js, css };
}

const sizes = new Map<string, { raw: number; br: number }>();
function sizeOf(file: string) {
  let size = sizes.get(file);
  if (!size) {
    const bytes = readFileSync(path.join(clientDir, file));
    size = { raw: bytes.length, br: brotliCompressSync(bytes).length };
    sizes.set(file, size);
  }
  return size;
}

function total(files: Set<string>) {
  let raw = 0;
  let br = 0;
  for (const file of files) {
    const size = sizeOf(file);
    raw += size.raw;
    br += size.br;
  }
  return { files: files.size, raw, br };
}

const kb = (bytes: number) => (bytes / 1024).toFixed(0).padStart(5);

function measure(routes: Record<string, ManifestRoute>) {
  return Object.fromEntries(
    Object.entries(PAGES).map(([name, ids]) => {
      const { js, css } = pageFiles(routes, ids);
      return [name, { js: total(js), css: total(css) }];
    }),
  );
}

/** Brotli kilobytes a page may preload, per kind of file. */
export type Budgets = Record<string, { js: number; css: number }>;

/**
 * The pages whose preloaded scripts or stylesheets (brotli) exceed their
 * budget. A page without a budget is reported too: a new page must set one.
 */
export function overBudget(
  measured: Record<string, { js: { br: number }; css: { br: number } }>,
  budgets: Budgets,
) {
  const over: Array<{
    page: string;
    kind: "js" | "css";
    kb: number;
    budget: number | undefined;
  }> = [];
  for (const [page, sizes] of Object.entries(measured)) {
    for (const kind of ["js", "css"] as const) {
      const budget = budgets[page]?.[kind];
      const used = sizes[kind].br / 1024;
      if (budget === undefined || used > budget) {
        over.push({ page, kind, kb: used, budget });
      }
    }
  }
  return over;
}

function check(routes: Record<string, ManifestRoute>) {
  const over = overBudget(measure(routes), budgetFile);
  if (over.length === 0) {
    console.log("Every page is within its budget.");
    return;
  }
  console.error("Pages over their preload budget (brotli):");
  for (const { page, kind, kb: used, budget } of over) {
    console.error(
      `  ${page} ${kind.toUpperCase()}: ${used.toFixed(1)} KB, ${budget === undefined ? "no budget set" : `budget ${budget} KB`}`,
    );
  }
  console.error(
    "Find what a page newly loads with `BUNDLE_SOURCEMAP=1 bun run build && bun scripts/bundle-report.ts --sources <page>`. Budgets: scripts/bundle-budgets.json.",
  );
  process.exit(1);
}

function report(routes: Record<string, ManifestRoute>) {
  const rows = measure(routes);
  for (const [name, { js: scripts, css: styles }] of Object.entries(rows)) {
    console.log(
      `${name.padEnd(13)} JS ${String(scripts.files).padStart(3)} files ${kb(scripts.raw)} KB, br ${kb(scripts.br)} KB   CSS ${String(styles.files).padStart(2)} files, br ${kb(styles.br)} KB`,
    );
  }
  console.log(
    `root route CSS: ${(routes.__root__?.css ?? []).map((file) => path.basename(file)).join(" ")}`,
  );
  return rows;
}

/** Generated bytes of a page's scripts, grouped by the source they came from. */
function sources(
  routes: Record<string, ManifestRoute>,
  page: string,
  filter?: string,
) {
  const ids = PAGES[page];
  if (!ids) throw new Error(`Unknown page ${page}.`);
  const bySource = new Map<string, number>();
  const unmapped: Array<string> = [];
  const files = pageFiles(routes, ids).js;
  for (const file of files) {
    const full = path.join(clientDir, file);
    let map: { mappings: string; sources: Array<string> };
    try {
      map = JSON.parse(readFileSync(`${full}.map`, "utf8"));
    } catch {
      // A few generated chunks (the bundler's runtime) carry no map.
      unmapped.push(file);
      bySource.set(`(no map) ${file}`, readFileSync(full).length);
      continue;
    }
    const lines = readFileSync(full, "utf8").split("\n");
    decode(map.mappings).forEach((segments, line) => {
      const length = lines[line]?.length ?? 0;
      segments.forEach((segment, i) => {
        if (segment.length < 4) return;
        const end = segments[i + 1]?.[0] ?? length;
        const source = map.sources[segment[1]!]!;
        bySource.set(source, (bySource.get(source) ?? 0) + (end - segment[0]));
      });
    });
  }
  if (unmapped.length > files.size / 2) {
    throw new Error("No source maps; build with BUNDLE_SOURCEMAP=1.");
  }
  const normal = (source: string) =>
    source
      .replace(/^(\.\.\/)+/, "")
      .replace(/^.*node_modules\//, "node_modules/");
  const group = (source: string) => {
    const name = normal(source);
    if (name.startsWith("node_modules/")) {
      const parts = name.split("/");
      return `npm: ${parts[1]!.startsWith("@") ? `${parts[1]}/${parts[2]}` : parts[1]}`;
    }
    const match =
      /src\/(features\/[^/]+|components\/[^/]+|routes\/[^/]+|paraglide|lib\/[^/]+|[^/]+)/.exec(
        name,
      );
    return match ? `src/${match[1]}` : name.slice(0, 60);
  };
  const groups = new Map<string, number>();
  for (const [source, bytes] of bySource) {
    groups.set(group(source), (groups.get(group(source)) ?? 0) + bytes);
  }
  const sum = [...groups.values()].reduce((a, b) => a + b, 0);
  console.log(`${page}: ${(sum / 1024).toFixed(0)} KB of generated code`);
  for (const [name, bytes] of [...groups]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)) {
    console.log(`${(bytes / 1024).toFixed(1).padStart(7)} KB  ${name}`);
  }
  if (filter) {
    console.log(`\nsources matching ${filter}:`);
    for (const [source, bytes] of [...bySource]
      .filter(([source]) => normal(source).includes(filter))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)) {
      console.log(
        `${(bytes / 1024).toFixed(1).padStart(7)} KB  ${normal(source).slice(-90)}`,
      );
    }
  }
}

if (import.meta.main) {
  const routes = await readManifest();
  const args = process.argv.slice(2);
  if (args[0] === "--sources") sources(routes, args[1] ?? "home", args[2]);
  else if (args[0] === "--check") check(routes);
  else if (args[0] === "--json") {
    console.log(JSON.stringify(measure(routes), null, 2));
  } else report(routes);
}
