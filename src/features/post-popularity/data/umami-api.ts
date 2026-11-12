import { z } from "zod";
import type {
  PostPopularityDailyViews,
  PostPopularityMetric,
  PostPopularityWindow,
} from "@/features/post-popularity/post-popularity";
import { ms } from "@/lib/duration";
import type { ServerEnv } from "@/lib/env/server.env";

const CLOUD_API_URL = "https://api.umami.is/v1";
const REQUEST_TIMEOUT = ms("10s");
const DEFAULT_PAGE_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const LoginResponseSchema = z.object({ token: z.string().min(1) });
const PageviewsSchema = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number().nonnegative());
const ExpandedMetricSchema = z.object({
  name: z.string(),
  pageviews: PageviewsSchema,
});
const ExpandedMetricsSchema = z.array(ExpandedMetricSchema);
/**
 * Umami `GET /websites/:id/pageviews`, checked against umami-software/umami
 * v3.5.0 (`src/app/api/websites/[websiteId]/pageviews/route.ts` and
 * `src/queries/sql/pageviews/getPageviewStats.ts`): the body is
 * `{ pageviews: [{ x, y }], sessions: [{ x, y }] }`, one bucket per `unit` that
 * has data (days without a view are absent). `x` is the bucket start in the
 * requested timezone, formatted by `getDateSQL`: `YYYY-MM-DDT00:00:00Z` for
 * `unit=day` in v3.5.0 (`DATE_FORMATS` in `src/lib/prisma.ts`,
 * `CLICKHOUSE_BUCKET_FORMATS` in `src/lib/clickhouse.ts`), `YYYY-MM-DD
 * HH:MM:SS` without a zone in older releases. `y` is a count, which a driver
 * may hand back as a numeric string. Both `x` formats are read as UTC.
 */
const DailyBucketsSchema = z.object({
  pageviews: z.array(z.object({ x: z.string(), y: PageviewsSchema })),
});

export type UmamiApiConfig =
  | {
      type: "cloud";
      apiUrl: string;
      websiteId: string;
      apiKey: string;
    }
  | {
      type: "self-hosted";
      apiUrl: string;
      websiteId: string;
      username: string;
      password: string;
    };

type UmamiEnv = Partial<
  Pick<
    ServerEnv,
    | "UMAMI_WEBSITE_ID"
    | "UMAMI_SRC"
    | "UMAMI_API_URL"
    | "UMAMI_API_KEY"
    | "UMAMI_USERNAME"
    | "UMAMI_PASSWORD"
  >
>;

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Missing ${name}`);
  return normalized;
}

function normalizeApiUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/$/, "");
}

export function resolveUmamiApiConfig(env: UmamiEnv): UmamiApiConfig {
  const websiteId = required(env.UMAMI_WEBSITE_ID, "UMAMI_WEBSITE_ID");
  const apiKey = env.UMAMI_API_KEY?.trim();
  const username = env.UMAMI_USERNAME?.trim();
  const password = env.UMAMI_PASSWORD?.trim();
  const hasCloudAuth = !!apiKey;
  const hasSelfHostedAuth = !!username || !!password;

  if (hasCloudAuth && hasSelfHostedAuth) {
    throw new Error("Umami Cloud and self-hosted credentials are both set");
  }

  if (hasCloudAuth) {
    return {
      type: "cloud",
      apiUrl: normalizeApiUrl(env.UMAMI_API_URL?.trim() || CLOUD_API_URL),
      websiteId,
      apiKey,
    };
  }

  if (hasSelfHostedAuth) {
    const resolvedUsername = required(username, "UMAMI_USERNAME");
    const resolvedPassword = required(password, "UMAMI_PASSWORD");
    const apiUrl = env.UMAMI_API_URL?.trim()
      ? normalizeApiUrl(env.UMAMI_API_URL)
      : normalizeApiUrl(
          new URL("/api", required(env.UMAMI_SRC, "UMAMI_SRC")).toString(),
        );
    return {
      type: "self-hosted",
      apiUrl,
      websiteId,
      username: resolvedUsername,
      password: resolvedPassword,
    };
  }

  throw new Error("Umami API credentials are not configured");
}

function utcDayStart(timestamp: number): number {
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

/** UTC midnight (ms) of a bucket label in either Umami date format, else null. */
function parseBucketDay(label: string): number | null {
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2})(?:\.\d+)?)?(Z)?$/.exec(
      label.trim(),
    );
  if (!match) return null;
  const parsed = Date.parse(`${match[1]}T${match[2] ?? "00:00:00"}Z`);
  return Number.isFinite(parsed) ? utcDayStart(parsed) : null;
}

/** One entry per UTC day of the window, oldest first, zero where Umami sent none. */
function fillDailyViews(
  buckets: Array<{ x: string; y: number }>,
  window: PostPopularityWindow,
): PostPopularityDailyViews[] {
  const viewsByDay = new Map<number, number>();
  for (const bucket of buckets) {
    const day = parseBucketDay(bucket.x);
    if (day === null) continue;
    viewsByDay.set(day, (viewsByDay.get(day) ?? 0) + Math.floor(bucket.y));
  }

  const daily: PostPopularityDailyViews[] = [];
  for (
    let day = utcDayStart(window.startAt);
    day <= window.endAt;
    day += DAY_MS
  ) {
    daily.push({ day, views: viewsByDay.get(day) ?? 0 });
  }
  return daily;
}

async function assertOk(response: Response, operation: string) {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(
    `${operation} failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`,
  );
}

export function createUmamiClient({
  fetcher = fetch,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  fetcher?: typeof fetch;
  pageSize?: number;
} = {}) {
  async function getAuthorization(config: UmamiApiConfig): Promise<string> {
    if (config.type === "cloud") return `Bearer ${config.apiKey}`;

    const response = await fetcher(`${config.apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    await assertOk(response, "Umami login");
    const { token } = LoginResponseSchema.parse(await response.json());
    return `Bearer ${token}`;
  }

  async function getPathMetrics(
    config: UmamiApiConfig,
    window: PostPopularityWindow,
  ): Promise<PostPopularityMetric[]> {
    const authorization = await getAuthorization(config);
    const metrics: PostPopularityMetric[] = [];
    let offset = 0;

    while (true) {
      const url = new URL(
        `${config.apiUrl}/websites/${encodeURIComponent(config.websiteId)}/metrics/expanded`,
      );
      url.searchParams.set("startAt", String(window.startAt));
      url.searchParams.set("endAt", String(window.endAt));
      url.searchParams.set("type", "path");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));

      const response = await fetcher(url, {
        headers: {
          Accept: "application/json",
          Authorization: authorization,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      await assertOk(response, "Umami metrics request");
      const page = ExpandedMetricsSchema.parse(await response.json());
      metrics.push(
        ...page.map((metric) => ({
          path: metric.name,
          pageviews: metric.pageviews,
        })),
      );

      if (page.length < pageSize) return metrics;
      offset += pageSize;
    }
  }

  async function getDailyViews(
    config: UmamiApiConfig,
    window: PostPopularityWindow,
  ): Promise<PostPopularityDailyViews[]> {
    const authorization = await getAuthorization(config);
    const url = new URL(
      `${config.apiUrl}/websites/${encodeURIComponent(config.websiteId)}/pageviews`,
    );
    url.searchParams.set("startAt", String(window.startAt));
    url.searchParams.set("endAt", String(window.endAt));
    url.searchParams.set("unit", "day");
    url.searchParams.set("timezone", "UTC");

    const response = await fetcher(url, {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    await assertOk(response, "Umami pageviews request");
    const { pageviews } = DailyBucketsSchema.parse(await response.json());
    return fillDailyViews(pageviews, window);
  }

  return { getPathMetrics, getDailyViews };
}

export const umamiClient = createUmamiClient();
