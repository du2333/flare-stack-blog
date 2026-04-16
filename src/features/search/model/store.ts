import type { RawData } from "@orama/orama";
import { load, save } from "@orama/orama";
import type { MyOramaDB } from "@/features/search/model/schema";
import { createMyDb } from "@/features/search/model/schema";

const KV_KEY = "search:index:v3";
const KV_META_KEY = "search:index:meta:v3";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function compressRaw(raw: RawData): Promise<Uint8Array> {
  // Prefer built-in compression to avoid extra deps; fall back to plain bytes if unsupported
  const json = JSON.stringify(raw);
  const encoded = textEncoder.encode(json);

  if (typeof CompressionStream === "undefined") {
    return encoded;
  }

  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(encoded);
  await writer.close();
  const compressed = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(compressed);
}

async function decompressToRaw(buffer: ArrayBuffer): Promise<RawData> {
  // Attempt gzip first; if it fails, treat as plain JSON string (back-compat)
  const tryGzip = async () => {
    if (typeof DecompressionStream === "undefined") {
      throw new TypeError("DecompressionStream unavailable");
    }

    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    await writer.write(new Uint8Array(buffer));
    await writer.close();
    const decompressed = await new Response(stream.readable).arrayBuffer();
    const json = textDecoder.decode(decompressed);
    return JSON.parse(json) as RawData;
  };

  try {
    return await tryGzip();
  } catch {
    const json = textDecoder.decode(new Uint8Array(buffer));
    return JSON.parse(json) as RawData;
  }
}

let cachedDb: MyOramaDB | null = null;
let cachedVersion: string | null = null;
let inflight: Promise<MyOramaDB> | null = null;

async function loadFromKv(env: Env): Promise<MyOramaDB | null> {
  const buf = await env.KV.get(KV_KEY, "arrayBuffer");
  if (!buf) return null;

  try {
    const raw = await decompressToRaw(buf);
    const db = await createMyDb();
    await load(db, raw);
    return db;
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "orama index load failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}

export async function getOramaDb(env: Env): Promise<MyOramaDB> {
  const meta = await getOramaMeta(env);
  const latestVersion = meta?.version || "init";

  if (cachedDb && cachedVersion === latestVersion) return cachedDb;
  if (inflight) return inflight;

  inflight = (async () => {
    const fromKv = await loadFromKv(env);
    if (fromKv) return fromKv;
    return await createMyDb();
  })().finally(() => {
    inflight = null;
  });

  cachedDb = await inflight;
  cachedVersion = latestVersion;
  return cachedDb;
}

export async function persistOramaDb(env: Env, db: MyOramaDB) {
  const raw = save(db);
  const compressed = await compressRaw(raw);
  await env.KV.put(KV_KEY, compressed);

  const newVersion = Date.now().toString();

  const meta = {
    version: newVersion,
    updatedAt: new Date().toISOString(),
    sizeInBytes: compressed.byteLength,
  };
  await env.KV.put(KV_META_KEY, JSON.stringify(meta));
  setOramaDb(db, newVersion);
  return newVersion;
}

export async function getOramaMeta(
  env: Env,
): Promise<{ version: string } | null> {
  return await env.KV.get(KV_META_KEY, "json");
}

export function setOramaDb(db: MyOramaDB, version: string) {
  cachedDb = db;
  cachedVersion = version;
}
