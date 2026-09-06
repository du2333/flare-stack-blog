import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

function requireEnv(env: EnvMap, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function prepareWranglerConfigContent({
  bucketName,
  d1DatabaseId,
  domain,
  kvNamespaceId,
  queueName,
  template,
  workerName,
}: {
  bucketName: string;
  d1DatabaseId: string;
  domain: string;
  kvNamespaceId: string;
  queueName: string;
  template: string;
  workerName: string;
}): string {
  const replacements = {
    D1_DATABASE_ID: d1DatabaseId,
    KV_NAMESPACE_ID: kvNamespaceId,
    DOMAIN_PLACEHOLDER: domain,
    "bucket-name-placeholder": bucketName,
    "queue-name-placeholder": queueName,
    "worker-name-placeholder": workerName,
  };

  let content = template;
  for (const [search, replacement] of Object.entries(replacements)) {
    content = content.replaceAll(search, replacement);
  }
  return content;
}

export function prepareWranglerConfig(env: EnvMap) {
  const domain = normalizeHostname(requireEnv(env, "DOMAIN"));
  const template = readFileSync(examplePath, "utf8");
  const workerName = requireEnv(env, "WORKER_NAME");
  const queueName = requireEnv(env, "QUEUE_NAME");
  const content = prepareWranglerConfigContent({
    bucketName: requireEnv(env, "BUCKET_NAME"),
    d1DatabaseId: requireEnv(env, "D1_DATABASE_ID"),
    domain,
    kvNamespaceId: requireEnv(env, "KV_NAMESPACE_ID"),
    queueName,
    template,
    workerName,
  });
  writeFileSync(outputPath, content);
  return { domain, queueName, workerName };
}

if (import.meta.main) {
  const { domain, queueName, workerName } = prepareWranglerConfig(process.env);
  console.log(
    `Prepared wrangler.jsonc with WORKER_NAME=${workerName}, QUEUE_NAME=${queueName}, DOMAIN=${domain}`,
  );
}
