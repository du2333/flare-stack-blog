import { z } from "zod";

// --- Schemas ---
const UmamiMetricSchema = z
  .object({
    value: z.number(),
    prev: z.number().optional(),
  })
  .or(
    z.number().transform((n) => ({
      value: n,
      prev: 0,
    })),
  );

export const UmamiStatsResponseSchema = z.object({
  pageviews: UmamiMetricSchema,
  visitors: UmamiMetricSchema,
  visits: UmamiMetricSchema,
  bounces: UmamiMetricSchema,
  totaltime: UmamiMetricSchema,
});

const UmamiChartDataSchema = z.object({
  x: z.string(),
  y: z.number(),
});

export const UmamiPageViewsResponseSchema = z.object({
  pageviews: z.array(UmamiChartDataSchema),
  sessions: z.array(UmamiChartDataSchema),
});

export type UmamiStats = z.infer<typeof UmamiStatsResponseSchema>;
export type UmamiChartData = z.infer<typeof UmamiChartDataSchema>;

// --- Client Config ---
export interface UmamiClientConfig {
  websiteId: string;
  src: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

// --- Client ---

export class UmamiClient {
  private baseUrl: string;
  private websiteId: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;
  private token: string | null = null;
  private isCloud: boolean;
  private apiBaseUrl: string; // For Cloud: https://api.umami.is

  private static detectCloudMode(config: UmamiClientConfig): boolean {
    return !!config.apiKey;
  }

  private static validateConfiguration(
    config: UmamiClientConfig,
    isCloud: boolean,
  ): void {
    if (isCloud) {
      // Warn if username/password also set
      if (config.username || config.password) {
        console.warn(
          JSON.stringify({
            message:
              "umami cloud mode detected, username and password will be ignored",
          }),
        );
      }

      // Warn if UMAMI_SRC doesn't look like Cloud
      if (config.src && !config.src.includes("umami.is")) {
        console.warn(
          JSON.stringify({
            message: "umami cloud mode but src is not umami.is",
            src: config.src,
          }),
        );
      }
    } else {
      // Warn if Cloud URL used without API key
      if (config.src && config.src.includes("cloud.umami.is")) {
        console.warn(
          JSON.stringify({
            message: "umami src points to cloud but no api key found",
          }),
        );
      }
    }
  }

  constructor(config: UmamiClientConfig) {
    // Detect Cloud mode
    this.isCloud = UmamiClient.detectCloudMode(config);

    // Validate configuration
    UmamiClient.validateConfiguration(config, this.isCloud);

    // Set base URLs
    this.baseUrl = config.src.replace(/\/$/, "");

    if (this.isCloud) {
      // Cloud API endpoint requires /v1 prefix
      // See: https://docs.umami.is/docs/cloud/api-key
      // 我去，官方文档有点误导啊，文档说是 /api/websites/，但是实际是 /v1/websites/
      this.apiBaseUrl = "https://api.umami.is/v1";
    } else {
      // Self-hosted uses same base for everything
      this.apiBaseUrl = this.baseUrl;
    }

    this.websiteId = config.websiteId;
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
  }

  private async login(): Promise<string | null> {
    if (!this.username || !this.password) return null;

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      // V2 login returns { token: string, user: ... }
      const schema = z.object({ token: z.string() });
      const parsed = schema.safeParse(data);
      if (parsed.success) {
        this.token = parsed.data.token;
        return parsed.data.token;
      }
      return null;
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "umami login failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      // Cloud / V2 API Key auth
      headers["x-umami-api-key"] = this.apiKey;
    } else {
      // Self-hosted / User-Pass auth
      if (!this.token) {
        await this.login();
      }
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    params: Record<string, string | number> = {},
  ): Promise<T | null> {
    try {
      // Cloud uses /v1/websites/, self-hosted uses /api/websites/
      const path = this.isCloud
        ? `/websites/${this.websiteId}${endpoint}`
        : `/api/websites/${this.websiteId}${endpoint}`;
      const url = new URL(`${this.apiBaseUrl}${path}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      let headers = await this.getHeaders();
      let res = await fetch(url.toString(), { headers });

      // Retry on 401 if using token (expired)
      if (res.status === 401 && !this.apiKey && this.username) {
        this.token = null;
        headers = await this.getHeaders();
        // Only retry if we got a new token/headers
        if (headers["Authorization"]) {
          res = await fetch(url.toString(), { headers });
        }
      }

      if (!res.ok) {
        console.error(
          JSON.stringify({
            message: "umami api error",
            status: res.status,
            statusText: res.statusText,
            isCloud: this.isCloud,
          }),
        );
        return null;
      }

      const data = await res.json();
      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error(
          JSON.stringify({
            message: "umami api schema validation failed",
            error: parsed.error.message,
          }),
        );
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "umami client error",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }

  async getStats(startAt: number, endAt: number): Promise<UmamiStats | null> {
    return this.request("/stats", UmamiStatsResponseSchema, {
      startAt,
      endAt,
    });
  }

  async getPageViews(
    startAt: number,
    endAt: number,
    unit: "hour" | "day" = "day",
  ): Promise<{
    pageviews: Array<UmamiChartData>;
    sessions: Array<UmamiChartData>;
  } | null> {
    return this.request("/pageviews", UmamiPageViewsResponseSchema, {
      startAt,
      endAt,
      unit,
    });
  }

  async getMetrics(
    startAt: number,
    endAt: number,
    type:
      | "path"
      | "referrer"
      | "browser"
      | "os"
      | "device"
      | "country" = "path",
    limit: number = 10,
    filters: Record<string, string> = {},
  ): Promise<Array<{ x: string; y: number }> | null> {
    const schema = z.array(z.object({ x: z.string(), y: z.number() }));
    return this.request("/metrics", schema, {
      startAt,
      endAt,
      type,
      limit,
      ...filters,
    });
  }

  public get isUmamiCloud(): boolean {
    return this.isCloud;
  }
}
