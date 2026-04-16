import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDomain } from "tldts";

type EnvMap = Record<string, string | undefined>;

const examplePath = resolve(process.cwd(), "wrangler.example.jsonc");
const outputPath = resolve(
  process.cwd(),
  process.env.WRANGLER_OUTPUT_PATH?.trim() || "wrangler.jsonc",
);

export function normalizeHostname(input: string): string {
  if (input.includes("://")) {
    return new URL(input).hostname;
  }
  return input.replace(/(?::\d+)?\/*$/, "");
}

export function inferZoneName(hostname: string): string {
  const zoneName = getDomain(hostname);

  if (!zoneName) {
    throw new Error(
      `Could not infer Cloudflare zone name from DOMAIN=${hostname}. ` +
        "Use a valid hostname such as blog.example.com.",
    );
  }

  return zoneName;
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function resolveDeployDomainMode(
  env: EnvMap,
): "custom_domain" | "routes" {
  if (isTruthyFlag(env.ROUTE)) {
    return "routes";
  }
  return "custom_domain";
}

export function buildRoutesBlock(
  hostname: string,
  mode: "custom_domain" | "routes",
  zoneNameOverride?: string,
): string {
  const route =
    mode === "routes"
      ? {
          pattern: `${hostname}/*`,
          zone_name: zoneNameOverride?.trim() || inferZoneName(hostname),
        }
      : { pattern: hostname, custom_domain: true };

  const inner = JSON.stringify([route], null, 2).replace(/^/gm, "  ").trim();
  return `"routes": ${inner},`;
}

type PrepareWranglerConfigOptions = {
  bucketName: string;
  d1DatabaseId: string;
  domain: string;
  kvNamespaceId: string;
  mode: "custom_domain" | "routes";
  template: string;
  zoneNameOverride?: string;
};

export function prepareWranglerConfigContent({
  bucketName,
  d1DatabaseId,
  domain,
  kvNamespaceId,
  mode,
  template,
  zoneNameOverride,
}: PrepareWranglerConfigOptions): string {
  const replacements = {
    D1_DATABASE_ID: d1DatabaseId,
    KV_NAMESPACE_ID: kvNamespaceId,
    DOMAIN_PLACEHOLDER: domain,
    "bucket-name-placeholder": bucketName,
  };

  let content = template;

  for (const [search, replacement] of Object.entries(replacements)) {
    content = content.replaceAll(search, replacement);
  }

  return content.replace(
    /"routes":\s*\[[\s\S]*?\],/,
    buildRoutesBlock(domain, mode, zoneNameOverride),
  );
}

export function prepareWranglerConfig(env: EnvMap): "custom_domain" | "routes" {
  const domain = normalizeHostname(requireEnv(env, "DOMAIN"));
  const mode = resolveDeployDomainMode(env);
  const template = readFileSync(examplePath, "utf8");

  const content = prepareWranglerConfigContent({
    bucketName: requireEnv(env, "BUCKET_NAME"),
    d1DatabaseId: requireEnv(env, "D1_DATABASE_ID"),
    domain,
    kvNamespaceId: requireEnv(env, "KV_NAMESPACE_ID"),
    mode,
    template,
    zoneNameOverride: env.ZONE_NAME?.trim(),
  });

  writeFileSync(outputPath, content);
  return mode;
}

function requireEnv(env: EnvMap, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

if (import.meta.main) {
  const domain = normalizeHostname(requireEnv(process.env, "DOMAIN"));
  const mode = prepareWranglerConfig(process.env);

  console.log(`Prepared wrangler.jsonc with mode=${mode}, DOMAIN=${domain}`);
}
